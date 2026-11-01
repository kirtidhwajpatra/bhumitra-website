// Cloudflare Pages Function: same-origin proxy from /api/* to the Bhumitra backend.
// Only the endpoints the web app uses are allowed through.
interface Env {
  BHUMITRA_API_ORIGIN?: string;
}

const GET_ALLOWED = [
  /^location\/search$/,
  /^gis\/(districts|blocks|gps|villages)$/,
  /^gis\/navigation\/districts-geojson$/,
  /^gis\/village\/[\w-]+\/(extent|parcels)$/,
  /^gis\/plot-at-point$/,
  /^ror$/,
  /^ror\/benchmark-valuation$/,
  /^subscription\/credits$/,
];
const POST_ALLOWED = [/^auth\/device$/, /^ror\/registration-estimate$/];
const CACHEABLE = /(\/parcels|\/extent|districts-geojson)$/;

async function forward(request: Request, path: string, env: Env): Promise<Response> {
  const origin = env.BHUMITRA_API_ORIGIN || "https://api.prettyplot.in";
  const url = new URL(request.url);
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": "BhumitraWeb/0.1",
    "x-forwarded-for": request.headers.get("cf-connecting-ip") ?? "",
  };
  const auth = request.headers.get("authorization");
  if (auth) headers.authorization = auth;
  if (request.method === "POST") headers["content-type"] = "application/json";
  const res = await fetch(`${origin}/api/v1/${path}${url.search}`, {
    method: request.method,
    headers,
    body: request.method === "POST" ? await request.text() : undefined,
    cf: request.method === "GET" && CACHEABLE.test(path) ? { cacheTtl: 86400, cacheEverything: true } : undefined,
  });
  const out = new Headers(res.headers);
  out.delete("set-cookie");
  if (CACHEABLE.test(path)) out.set("cache-control", "public, max-age=86400");
  return new Response(res.body, { status: res.status, headers: out });
}

const notFound = () => new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
const pathOf = (p: string | string[] | undefined) => (Array.isArray(p) ? p.join("/") : String(p ?? ""));

export const onRequestGet: PagesFunction<Env> = async ({ request, params, env }) => {
  const path = pathOf(params.path as string[]);
  return GET_ALLOWED.some((re) => re.test(path)) ? forward(request, path, env) : notFound();
};

export const onRequestPost: PagesFunction<Env> = async ({ request, params, env }) => {
  const path = pathOf(params.path as string[]);
  return POST_ALLOWED.some((re) => re.test(path)) ? forward(request, path, env) : notFound();
};
