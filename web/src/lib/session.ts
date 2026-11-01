// Guest session, the same kind the iOS and Android apps create on first launch
// (POST /auth/device). The backend applies its normal free-search rules to it.

const DEVICE_KEY = "bhumitra.deviceId.v1";
const TOKEN_KEY = "bhumitra.deviceToken.v1";

function uuid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `web-${uuid()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

let inflight: Promise<string | null> | null = null;

export async function getToken(forceNew = false): Promise<string | null> {
  if (!forceNew) {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) return t;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/device", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ device_id: deviceId(), app_account_token: uuid(), claim_flow_enabled: true }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      if (typeof body.access_token === "string") {
        localStorage.setItem(TOKEN_KEY, body.access_token);
        return body.access_token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
