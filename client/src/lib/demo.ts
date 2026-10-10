export type Provenance = "demo" | "terrain" | "calculated" | "hypothesis";
export type ReportStatus = "En attente" | "En cours de vérification" | "Validé" | "Rejeté" | "Doublon" | "Traité";
export type InterventionStatus = "À planifier" | "Planifiée" | "En cours" | "Terminée" | "À contrôler";

export type TimelineEvent = { label: string; date: string; note?: string };
export type Report = {
  id: string; date: string; arrondissement: string; category: string;
  severity: "Faible" | "Moyenne" | "Élevée"; location: string; lat: number; lng: number;
  description: string; status: ReportStatus; priority: "Basse" | "Moyenne" | "Haute";
  provenance: Provenance; rewardCredited: boolean; history: TimelineEvent[];
};
export type Intervention = {
  id: string; siteId: string; site: string; arrondissement: string; priority: "Basse" | "Moyenne" | "Haute";
  responsible: string; plannedDate: string; status: InterventionStatus; comment: string; history: TimelineEvent[];
};
export type Hub = { id: string; name: string; arrondissement: string; location: string; lat: number; lng: number; capacity: number; received: number; accepted: string[]; hours: string; operational: boolean };
export type Collector = { id: string; name: string; zone: string; status: "Actif" | "En formation" | "Suspendu"; quality: number; collectedKg: number; earnings: number; availability: string };
export type LedgerEntry = { id: string; date: string; label: string; amount: number; kind: "credit" | "debit" };
export type Collection = { id: string; date: string; category: string; declaredKg: number; verifiedKg: number | null; validatedKg: number | null; hub: string; status: "Déclarée" | "Vérifiée" | "Validée"; paid: boolean };
export type ImportedLayer = { id: string; name: string; fileName: string; geometryTypes: string[]; featureCount: number; validCount: number; warningCount: number; properties: string[]; provenance: "terrain"; importedAt: string; geojson: unknown; sourceCrs?: string; displayCrs?: string };
export type DemoState = { reports: Report[]; interventions: Intervention[]; hubs: Hub[]; collectors: Collector[]; collections: Collection[]; points: number; ledger: LedgerEntry[]; importedLayers: ImportedLayer[]; lastUpdated: string };

export const ARRONDISSEMENTS = ["Bohicon I", "Bohicon II", "Bohicon III", "Bohicon IV"];
export const CATEGORIES = ["Plastique", "Organique", "Papier / carton", "Métal", "Verre", "Mixte", "Autre"];

export function createInitialState(): DemoState {
  return { reports: [], interventions: [], hubs: [], collectors: [], collections: [], points: 0, ledger: [], importedLayers: [], lastUpdated: new Date().toISOString() };
}
export function formatFcfa(value: number) { return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`; }
const STORAGE_KEY = "bohicon-clean-terrain-only-v2";
export function persistState(state: DemoState) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastUpdated: new Date().toISOString() })); }
export function loadState(): DemoState { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return createInitialState(); return { ...createInitialState(), ...(JSON.parse(raw) as DemoState) }; } catch { return createInitialState(); } }

export function terrainReportsFromGeoJSON(input: unknown): Report[] {
  const features = Array.isArray((input as any)?.features) ? (input as any).features : [];
  return features.flatMap((feature: any, index: number) => {
    const coordinates = feature?.geometry?.coordinates;
    const properties = feature?.properties ?? {};
    if (feature?.geometry?.type !== "Point" || !Array.isArray(coordinates) || coordinates.length < 2) return [];
    const lng = Number(coordinates[0]); const lat = Number(coordinates[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    const code = String(properties["Code du dépôt"] ?? properties.code_depot_origine ?? `TERRAIN-${index + 1}`);
    const volume = String(properties["Volume estimé"] ?? "").toLowerCase();
    const type = String(properties["Type de dépôt"] ?? "Dépôt terrain");
    const priority: Report["priority"] = volume.includes("élev") || type.toLowerCase().includes("grand") ? "Haute" : volume.includes("moy") ? "Moyenne" : "Basse";
    const arrondissement = String(properties["Arrondissement"] ?? "Non attribué");
    const quartier = String(properties["Quartier"] ?? "Localisation terrain");
    const nature = String(properties["Nature des déchets présents"] ?? "Nature non renseignée");
    const date = String(properties["Date du relevé"] ?? properties["Date et heure de saisie"] ?? "Date non renseignée").slice(0, 10);
    return [{ id: code, date, arrondissement, category: type, severity: priority === "Haute" ? "Élevée" : priority === "Moyenne" ? "Moyenne" : "Faible", location: `${quartier} · ${arrondissement}`, lat, lng, description: nature, status: "En attente", priority, provenance: "terrain", rewardCredited: false, history: [{ label: "Donnée terrain importée", date, note: "Attributs source conservés dans la couche GeoJSON" }] }];
  });
}
