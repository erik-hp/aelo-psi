import http from "k6/http";
import { check, sleep } from "k6";

const base = __ENV.BASE_URL || "http://api-security:8000";
const vus = Number(__ENV.VUS || 1);

export const options = {
  scenarios: {
    small_clinic: { executor: "constant-vus", vus, duration: __ENV.DURATION || "15m" },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{kind:read}": ["p(95)<2000"],
    "http_req_duration{kind:write}": ["p(95)<3000"],
  },
};

const origin = { Origin: "http://localhost:3000" };
let access = null;
let patientId = null;
let draftVersion = 0;
let draftLoaded = false;
let iteration = 0;

function request(method, path, body, kind = "read") {
  const params = { headers: { ...origin, Authorization: `Bearer ${access}`, "Content-Type": "application/json" }, tags: { kind } };
  return http.request(method, `${base}${path}`, body ? JSON.stringify(body) : null, params);
}

export default function () {
  if (!access) {
    const login = http.post(`${base}/api/auth/login/`, JSON.stringify({
      username: `security1_${__VU}`, password: "synthetic-only-password-2026",
    }), { headers: { ...origin, "Content-Type": "application/json" } });
    if (!check(login, { "login succeeded": (response) => response.status === 200 })) return;
    access = login.json("access");
  }
  const patients = request("GET", "/api/patients/");
  if (!check(patients, { "patient list succeeded": (response) => response.status === 200 })) return;
  patientId = patientId || patients.json("results.0.id");
  if (!patientId) throw new Error("Synthetic patient was not seeded");
  if (!draftLoaded) {
    const cleared = request("DELETE", `/api/clinical-notes/drafts/${patientId}/`, null, "write");
    if (cleared.status !== 204) throw new Error("Cannot reset synthetic draft");
    draftVersion = 0;
    draftLoaded = true;
  }
  check(request("GET", `/api/clinical-notes/?patient=${patientId}`), { "notes succeeded": (response) => response.status === 200 });
  check(request("GET", `/api/vault/patients/${patientId}/`), { "vault succeeded": (response) => response.status === 200 });
  if (iteration % 5 === 0) {
    const draft = request("PUT", `/api/clinical-notes/drafts/${patientId}/`, {
      title: "Synthetic load draft", content: `Synthetic load note ${__VU}-${iteration}`, version: draftVersion,
    }, "write");
    check(draft, { "draft saved": (response) => response.status === 200 });
    if (draft.status === 200) draftVersion = draft.json("version");
  }
  if (iteration % 30 === 0) {
    check(request("POST", "/api/clinical-notes/", {
      patient: patientId, raw_text: `Synthetic load note ${__VU}-${iteration}: sono e rotina relatados.`,
    }, "write"), { "note saved": (response) => response.status === 201 });
  }
  iteration += 1;
  sleep(2);
}
