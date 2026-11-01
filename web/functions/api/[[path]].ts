// Cloudflare Pages Function: same-origin proxy from /api/* to the Bhumitra backend.
// Only the read endpoints the web app needs are allowed through.
interface Env {
  BHUMITRA_API_ORIGIN?: string;
}

const ALLOWED = [
  /^location\/search$/,
  /^gis\/(districts|blocks|gps|villages)$/,
  /^gis\/village\/[\w-]+\/(extent|parcels)$/,
  /^gis\/plot-at-point$/,
  /^ror$/,
  /^ror\/registration-estimate$/,
];

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path ?? "");
  if (!ALLOWED.some((re) => re.test(path))) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
  }
  const origin = env.BHUMITRA_API_ORIGIN || "https://api.prettyplot.in";
  const url = new URL(request.url);
  const upstream = `${origin}/api/v1/${path}${url.search}`;
  const res = await fetch(upstream, {
    headers: {
      accept: "application/json",
      "user-agent": "BhumitraWeb/0.1",
      "x-forwarded-for": request.headers.get("cf-connecting-ip") ?? "",
    },
    // Village plot outlines rarely change; let Cloudflare cache them.
    cf: path.endsWith("/parcels") || path.endsWith("/extent") ? { cacheTtl: 86400, cacheEverything: true } : undefined,
  });
  const headers = new Headers(res.headers);
  headers.delete("set-cookie");
  if (path.endsWith("/parcels") || path.endsWith("/extent")) headers.set("cache-control", "public, max-age=86400");
  return new Response(res.body, { status: res.status, headers });
};
