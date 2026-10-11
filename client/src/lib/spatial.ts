import type { AdministrativeArea } from "./demo";

export type Coordinate = [number, number];
export type SpatialMatch = { name: string; key: string; sourceId: string | number | null; method: "polygon" | "outside"; confidence: "computed" | "unavailable" };

function pointInRing(point: Coordinate, ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;
    const [x1, y1] = current;
    const [x2, y2] = next;
    const onEdge = Math.abs((y - y1) * (x2 - x1) - (x - x1) * (y2 - y1)) < 1e-10 && x >= Math.min(x1, x2) - 1e-10 && x <= Math.max(x1, x2) + 1e-10 && y >= Math.min(y1, y2) - 1e-10 && y <= Math.max(y1, y2) + 1e-10;
    if (onEdge) return true;
    if ((y1 > y) !== (y2 > y)) {
      const crossingX = ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
      if (x < crossingX) inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point: Coordinate, rings: number[][][]): boolean {
  const [outer, ...holes] = rings;
  return !!outer && pointInRing(point, outer) && !holes.some(hole => pointInRing(point, hole));
}

export function pointInGeometry(point: Coordinate, geometry: any): boolean {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.some((polygon: number[][][]) => pointInPolygon(point, polygon));
  return false;
}

export function linkPointToAdministrativeArea(point: Coordinate, input: any): SpatialMatch | null {
  const features = Array.isArray(input?.features) ? input.features : [];
  const match = features.find((feature: any) => pointInGeometry(point, feature.geometry));
  if (!match) return { name: "Non attribué", key: "outside", sourceId: null, method: "outside", confidence: "unavailable" };
  const properties = match.properties ?? {};
  const name = String(properties.BN_NIV4 ?? properties.name ?? "Entité sans nom");
  const index = features.indexOf(match);
  return { name, key: `${index + 1}:${name}`, sourceId: properties.ID ?? properties.OBJECTID ?? null, method: "polygon", confidence: "computed" };
}

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const earthRadius = 6_371_000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(b[1] - a[1]);
  const dLng = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function resolveAreaByName(areas: AdministrativeArea[], name: string): AdministrativeArea | undefined {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return areas.find(area => area.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() === normalized);
}
