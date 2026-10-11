export type Provenance = "demo" | "terrain" | "citizen" | "calculated" | "hypothesis" | "municipal";
export type ReportStatus = "En attente" | "En cours de vérification" | "Validé" | "Rejeté" | "Doublon" | "Traité";
export type InterventionStatus = "À planifier" | "Planifiée" | "En cours" | "Terminée" | "À contrôler";
export type DepotStatus = "Recensé" | "Confirmé" | "À contrôler";
export type AttachmentStatus = "local" | "uploaded" | "failed";

export type TimelineEvent = { label: string; date: string; note?: string; actorId?: string };
export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
  storageKey?: string;
  status: AttachmentStatus;
};

export type AdministrativeArea = {
  key: string;
  sourceId: string | number | null;
  name: string;
  sourceProperties: Record<string, unknown>;
  sourceCrs?: string;
  displayCrs?: string;
};

export type DepotSauvage = {
  entityType: "depot";
  id: string;
  sourceCode: string;
  date: string;
  arrondissement: string;
  arrondissementSource: string;
  arrondissementComputed?: string;
  category: string;
  severity: "Faible" | "Moyenne" | "Élevée";
  location: string;
  lat: number;
  lng: number;
  description: string;
  status: DepotStatus;
  priority: "Basse" | "Moyenne" | "Haute";
  provenance: "terrain";
  sourceProperties: Record<string, unknown>;
  history: TimelineEvent[];
};

export type Signalement = {
  entityType: "signalement";
  id: string;
  createdAt: string;
  date: string;
  authorId?: string;
  arrondissement: string;
  arrondissementSource?: string;
  arrondissementComputed?: string;
  category: string;
  severity: "Faible" | "Moyenne" | "Élevée";
  location: string;
  lat: number;
  lng: number;
  description: string;
  status: ReportStatus;
  priority: "Basse" | "Moyenne" | "Haute";
  provenance: "citizen" | "municipal" | "demo";
  attachments: Attachment[];
  linkedDepotId?: string;
  rewardCredited: boolean;
  history: TimelineEvent[];
};

/** Alias de transition conservé pour les composants existants ; les nouveaux modules utilisent Signalement. */
export type Report = Signalement;
export type MapEntity = DepotSauvage | Signalement;

export type Intervention = {
  entityType: "intervention";
  id: string;
  siteId: string;
  site: string;
  arrondissement: string;
  priority: "Basse" | "Moyenne" | "Haute";
  responsible: string;
  plannedDate: string;
  startedAt?: string;
  endedAt?: string;
  status: InterventionStatus;
  comment: string;
  attachments?: Attachment[];
  history: TimelineEvent[];
};

export type PointRegroupement = {
  entityType: "point-regroupement";
  id: string;
  name: string;
  arrondissement: string;
  location: string;
  lat: number;
  lng: number;
  capacity: number | null;
  received: number | null;
  accepted: string[];
  hours: string | null;
  operational: boolean | null;
  verified: boolean;
  provenance: Provenance;
  responsible?: string;
  lastVerifiedAt?: string;
  history: TimelineEvent[];
};

/** Compatibilité temporaire avec l’ancien nom utilisé par les écrans. */
export type Hub = PointRegroupement;
export type Collector = { id: string; name: string; zone: string; status: "Actif" | "En formation" | "Suspendu"; quality: number | null; collectedKg: number | null; earnings: number | null; availability: string; authorized?: boolean; applicationStatus?: "Brouillon" | "Soumise" | "En formation" | "Autorisée" | "Suspendue" };
export type LedgerEntry = { id: string; date: string; label: string; amount: number; kind: "credit" | "debit"; sourceId?: string };
export type Collection = { entityType: "collecte"; id: string; createdAt: string; date: string; category: string; declaredKg: number; verifiedKg: number | null; validatedKg: number | null; hub: string; hubId?: string; status: "Déclarée" | "Vérifiée" | "Validée"; paid: boolean; collectorId?: string; history?: TimelineEvent[] };
export type ImportedLayer = { id: string; name: string; fileName: string; geometryTypes: string[]; featureCount: number; validCount: number; warningCount: number; properties: string[]; provenance: "terrain"; importedAt: string; geojson: unknown; sourceCrs?: string; displayCrs?: string };
export type DemoState = { depots: DepotSauvage[]; reports: Signalement[]; interventions: Intervention[]; hubs: PointRegroupement[]; collectors: Collector[]; collections: Collection[]; administrativeAreas: AdministrativeArea[]; points: number; ledger: LedgerEntry[]; importedLayers: ImportedLayer[]; lastUpdated: string };

/** La source de référence est la couche administrative reçue, jamais une liste inventée dans l’UI. */
export const CATEGORIES = ["Plastique", "Organique", "Papier / carton", "Métal", "Verre", "Mixte", "Autre"];

export function createInitialState(): DemoState {
  return { depots: [], reports: [], interventions: [], hubs: [], collectors: [], collections: [], administrativeAreas: [], points: 0, ledger: [], importedLayers: [], lastUpdated: new Date().toISOString() };
}

export function formatFcfa(value: number) { return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`; }
const STORAGE_KEY = "bohicon-clean-terrain-only-v3";

export function uniqueId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isCitizenSignalement(value: unknown): value is Signalement {
  const item = value as Partial<Signalement> | null;
  return !!item && (item as any).entityType !== "depot" && (item as any).provenance !== "terrain" && typeof item.id === "string";
}

export function persistState(state: DemoState) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastUpdated: new Date().toISOString() })); }

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<DemoState> & { reports?: unknown[] };
    const fresh = createInitialState();
    // Les anciennes entrées terrain de type Report sont volontairement ignorées ici.
    // La source GeoJSON est rechargée séparément comme DepotSauvage, sans récompense.
    const reports = Array.isArray(parsed.reports) ? parsed.reports.filter(isCitizenSignalement).map(item => ({ ...item, attachments: Array.isArray(item.attachments) ? item.attachments : [], entityType: "signalement", provenance: item.provenance === "municipal" ? "municipal" : "citizen" })) as Signalement[] : [];
    return { ...fresh, ...parsed, reports, depots: Array.isArray(parsed.depots) ? parsed.depots : [] };
  } catch {
    return createInitialState();
  }
}

function sourceText(properties: Record<string, unknown>, key: string, fallback: string) {
  const value = properties[key];
  return value == null || String(value).trim() === "" ? fallback : String(value);
}

export function administrativeAreasFromGeoJSON(input: any): AdministrativeArea[] {
  const features = Array.isArray(input?.features) ? input.features : [];
  return features.map((feature: any, index: number) => {
    const properties = (feature?.properties ?? {}) as Record<string, unknown>;
    const name = sourceText(properties, "BN_NIV4", `Entité ${index + 1}`);
    const sourceId = (properties.ID ?? properties.OBJECTID ?? null) as string | number | null;
    return { key: `${index + 1}:${name}`, sourceId, name, sourceProperties: properties, sourceCrs: input?.sourceCrs ?? input?.crs?.properties?.name, displayCrs: input?.displayCrs ?? "EPSG:4326" };
  });
}

export function terrainDepositsFromGeoJSON(input: unknown): DepotSauvage[] {
  const features = Array.isArray((input as any)?.features) ? (input as any).features : [];
  return features.flatMap((feature: any, index: number) => {
    const coordinates = feature?.geometry?.coordinates;
    const properties = (feature?.properties ?? {}) as Record<string, unknown>;
    if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates) || coordinates.length < 2) return [];
    const lng = Number(coordinates[0]); const lat = Number(coordinates[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    const code = sourceText(properties, "Code du dépôt", `TERRAIN-${index + 1}`);
    const volume = sourceText(properties, "Volume estimé", "").toLowerCase();
    const type = sourceText(properties, "Type de dépôt", "Dépôt terrain");
    const priority: DepotSauvage["priority"] = volume.includes("élev") || type.toLowerCase().includes("grand") ? "Haute" : volume.includes("moy") ? "Moyenne" : "Basse";
    const arrondissement = sourceText(properties, "Arrondissement", "Non attribué");
    const quartier = sourceText(properties, "Quartier", "Localisation terrain");
    const nature = sourceText(properties, "Nature des déchets présents", "Nature non renseignée");
    const date = sourceText(properties, "Date du relevé", sourceText(properties, "Date et heure de saisie", "Date non renseignée")).slice(0, 10);
    return [{ entityType: "depot", id: code, sourceCode: code, date, arrondissement, arrondissementSource: arrondissement, category: type, severity: priority === "Haute" ? "Élevée" : priority === "Moyenne" ? "Moyenne" : "Faible", location: `${quartier} · ${arrondissement}`, lat, lng, description: nature, status: "Recensé", priority, provenance: "terrain", sourceProperties: properties, history: [{ label: "Dépôt recensé dans l’inventaire source", date, note: "Les attributs originaux sont conservés ; aucun signalement citoyen n’est créé." }] } satisfies DepotSauvage];
  });
}
