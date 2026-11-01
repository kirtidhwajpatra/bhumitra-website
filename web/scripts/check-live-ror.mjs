// Checks the live backend returns a full (unmasked) record for a fresh guest session.
// Usage: node scripts/check-live-ror.mjs [lat] [lng] [count]
const API = "https://api.prettyplot.in/api/v1";
const [lat = "21.017427", lng = "83.774846", count = "8"] = process.argv.slice(2);

const auth = await fetch(`${API}/auth/device`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ device_id: `web-check-${crypto.randomUUID()}`, platform: "web" }),
}).then((r) => r.json());
const token = auth.access_token || auth.token;
const H = { authorization: `Bearer ${token}` };

const hit = await fetch(`${API}/gis/plot-at-point?lat=${lat}&lng=${lng}`, { headers: H }).then((r) => r.json());
console.log("plot-at-point:", JSON.stringify(hit).slice(0, 300));
const p = hit.plot || hit;
const params = new URLSearchParams({
  district: p.district_name ?? p.district ?? "", tahasil: p.tahasil_name ?? p.block_name ?? p.tahasil ?? "",
  village: p.village_name ?? p.village ?? "", plot: String(p.plot_number ?? p.plot_no ?? p.plot ?? ""),
  ...(p.b_id ?? p.block_id ? { b_id: String(p.b_id ?? p.block_id) } : {}),
  ...(p.v_id ?? p.village_id ? { v_id: String(p.v_id ?? p.village_id) } : {}),
});
// Repeat past the old guest limit (5) to prove there is no quota.
for (let i = 1; i <= Number(count); i++) {
  const r = await fetch(`${API}/ror?${params}`, { headers: H });
  const j = await r.json();
  const owners = (j.owners || []).map((o) => o.name || o.owner_name).slice(0, 3);
  console.log(`#${i} ${r.status} preview=${!!j.is_preview} khata=${j.khata_number ?? j.khata_no ?? j.detail?.code ?? "-"} owners=${JSON.stringify(owners)}`);
}
