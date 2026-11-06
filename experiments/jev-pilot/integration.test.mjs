import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./node_modules/jev-gateway/dist/app.js";
import { loadConfig } from "./node_modules/jev-gateway/dist/config.js";

const requestBody = {
  model: "synthetic-model", stream: false,
  messages: [{ role: "user", content: "Read the synthetic source file before editing." }],
  tools: [{ type: "function", function: { name: "read_source", description: "Read source code", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } }],
};
const selected = (confidence = 0.95) => ({ answers: {
  tool: { type: "choice", choice: "read_source", confidence, probabilities: { read_source: 0.99, no_tool_needed: 0.01 } },
  needs_tool: { type: "noul", noul: 0.99 },
}, usage: { input_tokens: 80, output_tokens: 0 } });

function fixture({ routing = true, ask = async () => selected() } = {}) {
  const counters = { jev: 0, upstream: 0 };
  const config = loadConfig({ UPSTREAM_BASE_URL: "https://upstream.invalid/v1", UPSTREAM_API_KEY: "synthetic-upstream-key", ROUTER_API_KEY: "synthetic-router-key", JEV_DIRECT_CALLS: "false", JEV_ON_NONE: "passthrough", JEV_ROUTING: String(routing) });
  let forwarded;
  const app = createApp({ config,
    askJev: async (question) => { counters.jev++; return ask(question); },
    fetch: async (_url, options) => {
      counters.upstream++;
      forwarded = JSON.parse(await new Response(options.body).text());
      return Response.json({ choices: [{ message: { role: "assistant", content: "Synthetic response" }, finish_reason: "stop" }], usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 } });
    },
  });
  const send = (body = requestBody, authenticated = true) => app.request("/v1/chat/completions", {
    method: "POST", headers: { "content-type": "application/json", ...(authenticated ? { authorization: "Bearer synthetic-router-key" } : {}) }, body: JSON.stringify(body),
  });
  return { send, counters, forwarded: () => forwarded };
}

test("baseline forwards unchanged and never calls Jev", async () => {
  const f = fixture({ routing: false });
  const response = await f.send();
  assert.equal(response.status, 200);
  await response.json();
  assert.deepEqual(f.forwarded(), requestBody);
  assert.deepEqual(f.counters, { jev: 0, upstream: 1 });
});

test("a confident simulated decision selects a declared tool", async () => {
  const f = fixture();
  const response = await f.send();
  assert.equal(response.status, 200);
  await response.json();
  assert.equal(response.headers.get("x-jev-gateway-mode"), "forced");
  assert.equal(f.forwarded().tool_choice.function.name, "read_source");
  assert.deepEqual(f.counters, { jev: 1, upstream: 1 });
});

test("provider failure falls back explicitly, without claiming Jev routed", async () => {
  const f = fixture({ ask: async () => { throw new Error("synthetic provider unavailable"); } });
  const response = await f.send();
  assert.equal(response.status, 200);
  await response.json();
  assert.equal(response.headers.get("x-jev-gateway-mode"), "passthrough");
  assert.match(response.headers.get("x-jev-gateway-reason"), /jev_error/);
  assert.deepEqual(f.forwarded(), requestBody);
});

test("uncertain simulated decision leaves the request unchanged", async () => {
  const f = fixture({ ask: async () => selected(0.3) });
  const response = await f.send();
  await response.json();
  assert.equal(response.headers.get("x-jev-gateway-reason"), "low_confidence");
  assert.deepEqual(f.forwarded(), requestBody);
});

test("unauthenticated request is denied before provider or upstream", async () => {
  const f = fixture();
  const response = await f.send(requestBody, false);
  assert.equal(response.status, 401);
  assert.deepEqual(f.counters, { jev: 0, upstream: 0 });
});
