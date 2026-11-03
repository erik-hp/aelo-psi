import { apiClient } from "@/api/client";

type Decision = "VALIDATED" | "REJECTED";
type StoredKey = { privateKey: CryptoKey; fingerprint: string };

const DATABASE = "aelo-signing-keys";
const STORE = "keys";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getStoredKey(userId: string): Promise<StoredKey | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(userId);
      request.onsuccess = () => resolve(request.result as StoredKey | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function storeKey(userId: string, value: StoredKey): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(value, userId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(userId: string): Promise<CryptoKey> {
  const { data: registration } = await apiClient.get<{ registered: boolean; fingerprint: string | null }>("/users/me/signing-key/");
  const stored = await getStoredKey(userId);
  if (registration.registered) {
    if (!stored || stored.fingerprint !== registration.fingerprint) {
      throw new Error("A chave de assinatura desta conta não está disponível neste navegador. Solicite recuperação ao administrador.");
    }
    return stored.privateKey;
  }

  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", publicKey)))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  await storeKey(userId, { privateKey: pair.privateKey, fingerprint });
  await apiClient.post("/users/me/signing-key/", { public_key_spki: toBase64(publicKey) });
  return pair.privateKey;
}

export const signingService = {
  async review(analysisId: string, decision: Decision, comment: string, userId: string): Promise<void> {
    const privateKey = await signingKey(userId);
    const { data } = await apiClient.post<{ payload: string }>(`/analysis/${analysisId}/signing-payload/`, { decision, comment });
    const payload = fromBase64(data.payload);
    const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, payload));
    await apiClient.post(`/analysis/${analysisId}/${decision === "VALIDATED" ? "validate" : "reject"}/`, {
      comment,
      signature: toBase64(signature),
    });
  },
};
