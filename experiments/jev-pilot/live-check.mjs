import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./node_modules/jev-gateway/dist/config.js";
import { createAskJev } from "./node_modules/jev-gateway/dist/jev.js";
import { decide } from "./node_modules/jev-gateway/dist/decide.js";

// No application files, authentication tokens, clinical notes or Codex conversation are read.
const config = loadConfig({ JEV_PROVIDER: process.env.JEV_PROVIDER,
  TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY, OPENCODE_API_KEY: process.env.OPENCODE_API_KEY,
  JEV_DIRECT_CALLS: "false", JEV_ON_NONE: "passthrough", JEV_TIMEOUT_MS: "10000" });
if (!config.jevApiKey) {
  console.error("JEV_LIVE_NOT_RUN: provider key missing. Use configure.ps1; never paste a key in chat.");
  process.exit(2);
}
const ask = createAskJev(config);
let calls = 0;
let returnedModel;
const measuredAsk = async (question) => {
  calls++;
  const result = await ask(question);
  returnedModel = result.model;
  return result;
};
const cases = [
  { id: "read", prompt: "You must inspect the file widget.ts before changing it. Which tool should be called next?", expected: "read_source" },
  { id: "test", prompt: "The code change is complete. Run the unit test suite now to check for regressions.", expected: "run_tests" },
  { id: "finish", prompt: "All work and tests are complete. No files or commands are needed. Reply with a brief completion message.", expected: "no_tool_needed" },
];
const tools = [
  { name: "read_source", description: "Read the contents of a source file", kind: "function", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "run_tests", description: "Execute the unit test suite", kind: "function", parameters: { type: "object", properties: {} } },
];
const results = [];
for (const item of cases) {
  const decision = await decide({ system: "Select a next step for a synthetic coding exercise.", turns: [{ role: "user", text: item.prompt }], tools, toolChoice: "auto", steer: "force", thinking: false }, config, measuredAsk);
  const selected = decision.jev?.choice;
  results.push({ id: item.id, expected: item.expected, selected: selected ?? null, correct: selected === item.expected, mode: decision.mode,
    confidence: decision.jev?.confidence ?? null, inputTokens: decision.jev?.inputTokens ?? null, latencyMs: decision.jev?.latencyMs ?? null,
    // Never persist provider error bodies; they can contain unexpected sensitive text.
    error: !decision.jev ? "no_valid_jev_decision" : null });
  if (!decision.jev) break;
}
const report = { type: "live-provider-smoke-not-coding-benchmark", gateway: "0.5.1", provider: config.jevProvider,
  requestedModel: config.jevModel, returnedModel: returnedModel ?? null, date: new Date().toISOString(), logicalCalls: calls,
  complete: results.length === cases.length && results.every((item) => item.selected !== null), results,
  cost: "Not measured; no claimed token or monetary savings." };
const runtime = fileURLToPath(new URL(".runtime/", import.meta.url));
mkdirSync(runtime, { recursive: true });
writeFileSync(new URL(".runtime/live-result.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.complete && results.every((item) => item.correct) ? 0 : 1;
