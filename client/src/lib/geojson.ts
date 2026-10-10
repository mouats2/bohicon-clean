export type GeoIssue = { kind: "error" | "warning"; message: string };

export type GeoInspection = {
  valid: boolean;
  geometryTypes: string[];
  featureCount: number;
  validCount: number;
  issues: GeoIssue[];
  propertyKeys: string[];
  features: any[];
};

const supported = new Set(["Point", "MultiPoint", "Polygon", "MultiPolygon"]);

function coordinatePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]));
}

function coordinatesValid(coords: unknown): boolean {
  if (coordinatePair(coords)) {
    const [lng, lat] = coords;
    return Math.abs(Number(lng)) <= 180 && Math.abs(Number(lat)) <= 90;
  }
  return Array.isArray(coords) && coords.length > 0 && coords.every(coordinatesValid);
}

function geometryType(feature: any) {
  return feature?.geometry?.type ?? "Inconnu";
}

export function inspectGeoJSON(input: unknown): GeoInspection {
  const issues: GeoIssue[] = [];
  const propertyKeys = new Set<string>();
  let features: any[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, geometryTypes: [], featureCount: 0, validCount: 0, issues: [{ kind: "error", message: "Le fichier n’est pas un objet GeoJSON." }], propertyKeys: [], features: [] };
  }

  const root = input as any;
  if (root.type === "FeatureCollection") features = Array.isArray(root.features) ? root.features : [];
  else if (root.type === "Feature") features = [root];
  else {
    issues.push({ kind: "error", message: "Type attendu : FeatureCollection ou Feature." });
  }

  if (root.crs) issues.push({ kind: "warning", message: "Un champ CRS est présent : vérifiez explicitement le système de coordonnées avant usage." });
  if (!features.length && !issues.some(i => i.kind === "error")) issues.push({ kind: "warning", message: "Aucune entité trouvée dans le fichier." });

  const geometryTypes = new Set<string>();
  let validCount = 0;
  features.forEach((feature, index) => {
    const type = geometryType(feature);
    geometryTypes.add(type);
    Object.keys(feature?.properties ?? {}).forEach(key => propertyKeys.add(key));
    if (!feature || feature.type !== "Feature") {
      issues.push({ kind: "error", message: `Entité ${index + 1} : objet Feature manquant.` });
      return;
    }
    if (!feature.geometry || !supported.has(type)) {
      issues.push({ kind: "error", message: `Entité ${index + 1} : géométrie ${type} non prise en charge.` });
      return;
    }
    if (!coordinatesValid(feature.geometry.coordinates)) {
      issues.push({ kind: "error", message: `Entité ${index + 1} : coordonnées absentes ou hors des plages longitude/latitude.` });
      return;
    }
    validCount += 1;
  });

  if (!root.name && features.length) issues.push({ kind: "warning", message: "Nom de couche absent : le fichier sera conservé avec son nom de fichier." });
  if (!propertyKeys.size && features.length) issues.push({ kind: "warning", message: "Aucun attribut descriptif détecté dans les propriétés source." });

  return {
    valid: !issues.some(i => i.kind === "error") && validCount > 0,
    geometryTypes: [...geometryTypes],
    featureCount: features.length,
    validCount,
    issues,
    propertyKeys: [...propertyKeys],
    features,
  };
}

export function flattenCoordinates(geometry: any): [number, number][] {
  if (!geometry?.coordinates) return [];
  const output: [number, number][] = [];
  const visit = (coords: any) => {
    if (coordinatePair(coords)) output.push([Number(coords[0]), Number(coords[1])]);
    else if (Array.isArray(coords)) coords.forEach(visit);
  };
  visit(geometry.coordinates);
  return output;
}

export function inspectionSummary(inspection: GeoInspection) {
  const errors = inspection.issues.filter(issue => issue.kind === "error").length;
  const warnings = inspection.issues.filter(issue => issue.kind === "warning").length;
  return { errors, warnings };
}


function inverseUtm31(x: number, y: number): [number, number] {
  const a = 6378137;
  const eccentricity = 0.00669438;
  const eccentricityPrime = eccentricity / (1 - eccentricity);
  const scale = 0.9996;
  const centralMeridian = (3 * Math.PI) / 180;
  const e1 = (1 - Math.sqrt(1 - eccentricity)) / (1 + Math.sqrt(1 - eccentricity));
  const xx = x - 500000;
  const mu = y / scale / (a * (1 - eccentricity / 4 - (3 * eccentricity ** 2) / 64 - (5 * eccentricity ** 3) / 256));
  const phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sinPhi = Math.sin(phi1); const cosPhi = Math.cos(phi1); const tanPhi = Math.tan(phi1);
  const n = a / Math.sqrt(1 - eccentricity * sinPhi ** 2);
  const r = a * (1 - eccentricity) / (1 - eccentricity * sinPhi ** 2) ** 1.5;
  const t = tanPhi ** 2; const c = eccentricityPrime * cosPhi ** 2; const d = xx / (n * scale);
  const lat = phi1 - (n * tanPhi / r) * (d ** 2 / 2 - (5 + 3 * t + 10 * c - 4 * c ** 2 - 9 * eccentricityPrime) * d ** 4 / 24 + (61 + 90 * t + 298 * c + 45 * t ** 2 - 252 * eccentricityPrime - 3 * c ** 2) * d ** 6 / 720);
  const lon = centralMeridian + (d - (1 + 2 * t + c) * d ** 3 / 6 + (5 - 2 * c + 28 * t - 3 * c ** 2 + 8 * eccentricityPrime + 24 * t ** 2) * d ** 5 / 120) / cosPhi;
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

function transformCoordinates(value: any): any {
  if (coordinatePair(value)) {
    const [lng, lat] = inverseUtm31(Number(value[0]), Number(value[1]));
    return Array.isArray(value) && value.length >= 3 ? [lng, lat, (value as any)[2]] : [lng, lat];
  }
  return Array.isArray(value) ? value.map(transformCoordinates) : value;
}

export function normalizeGeoJSONForDisplay(input: any): any {
  const crsName = String(input?.crs?.properties?.name ?? "");
  const isUtm31 = /32631|UTM.*31/i.test(crsName);
  if (!isUtm31) return input;
  return {
    ...input,
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::4326" } },
    sourceCrs: "EPSG:32631",
    displayCrs: "EPSG:4326",
    features: Array.isArray(input.features) ? input.features.map((feature: any) => ({ ...feature, geometry: feature.geometry ? { ...feature.geometry, coordinates: transformCoordinates(feature.geometry.coordinates) } : feature.geometry })) : input.features,
  };
}
