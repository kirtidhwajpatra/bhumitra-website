// Small geometry helpers (no dependencies).

const R = 6378137; // WGS84 radius in metres

function ringArea(ring: number[][]): number {
  // Spherical excess approximation, same as Turf's area().
  let total = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    total += ((x2 - x1) * Math.PI) / 180 * (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return Math.abs((total * R * R) / 2);
}

/** Area in square metres of a Polygon or MultiPolygon. */
export function areaSqM(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): number {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  let a = 0;
  for (const p of polys) {
    a += ringArea(p[0]);
    for (const hole of p.slice(1)) a -= ringArea(hole);
  }
  return a;
}

export const SQM_PER_ACRE = 4046.8564224;

export function bbox(g: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const p of polys) for (const [x, y] of p[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/** "1.4580 acre" style formatting used across the app. */
export function formatArea(acres: number | null | undefined): { acre: string; decimal: string; sqft: string } | null {
  if (acres == null || !isFinite(acres)) return null;
  return {
    acre: acres.toFixed(4),
    decimal: (acres * 100).toFixed(2),
    sqft: Math.round(acres * 43560).toLocaleString("en-IN"),
  };
}

/** Odisha's rough bounds, used to keep the camera in the state. */
export const ODISHA_BOUNDS: [[number, number], [number, number]] = [[81.2, 17.6], [87.7, 22.7]];
export const ODISHA_CENTER: [number, number] = [84.4, 20.4];
