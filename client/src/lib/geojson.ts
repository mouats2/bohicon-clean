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
