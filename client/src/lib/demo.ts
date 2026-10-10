export type Provenance = "demo" | "terrain" | "calculated" | "hypothesis";
export type ReportStatus = "En attente" | "En cours de vérification" | "Validé" | "Rejeté" | "Doublon" | "Traité";
export type InterventionStatus = "À planifier" | "Planifiée" | "En cours" | "Terminée" | "À contrôler";

export type TimelineEvent = {
  label: string;
  date: string;
  note?: string;
};

export type Report = {
  id: string;
  date: string;
  arrondissement: string;
  category: string;
  severity: "Faible" | "Moyenne" | "Élevée";
  location: string;
  lat: number;
  lng: number;
  description: string;
  status: ReportStatus;
  priority: "Basse" | "Moyenne" | "Haute";
  provenance: Provenance;
  rewardCredited: boolean;
  history: TimelineEvent[];
};

export type Intervention = {
  id: string;
  siteId: string;
  site: string;
  arrondissement: string;
  priority: "Basse" | "Moyenne" | "Haute";
  responsible: string;
  plannedDate: string;
  status: InterventionStatus;
  comment: string;
  history: TimelineEvent[];
};

export type Hub = {
  id: string;
  name: string;
  arrondissement: string;
  location: string;
  lat: number;
  lng: number;
  capacity: number;
  received: number;
  accepted: string[];
  hours: string;
  operational: boolean;
};

export type Collector = {
  id: string;
  name: string;
  zone: string;
  status: "Actif" | "En formation" | "Suspendu";
  quality: number;
  collectedKg: number;
  earnings: number;
  availability: string;
};

export type LedgerEntry = {
  id: string;
  date: string;
  label: string;
  amount: number;
  kind: "credit" | "debit";
};

export type Collection = {
  id: string;
  date: string;
  category: string;
  declaredKg: number;
  verifiedKg: number | null;
  validatedKg: number | null;
  hub: string;
  status: "Déclarée" | "Vérifiée" | "Validée";
  paid: boolean;
};

export type ImportedLayer = {
  id: string;
  name: string;
  fileName: string;
  geometryTypes: string[];
  featureCount: number;
  validCount: number;
  warningCount: number;
  properties: string[];
  provenance: "terrain";
  importedAt: string;
  geojson: unknown;
};

export type DemoState = {
  reports: Report[];
  interventions: Intervention[];
  hubs: Hub[];
  collectors: Collector[];
  collections: Collection[];
  points: number;
  ledger: LedgerEntry[];
  importedLayers: ImportedLayer[];
  lastUpdated: string;
};

export const ARRONDISSEMENTS = ["Bohicon I", "Bohicon II", "Bohicon III", "Bohicon IV"];
export const CATEGORIES = ["Plastique", "Organique", "Papier / carton", "Métal", "Verre", "Mixte", "Autre"];

export const seedReports: Report[] = [
  {
    id: "BC-2026-041",
    date: "12 oct. 2026",
    arrondissement: "Bohicon II",
    category: "Plastique",
    severity: "Élevée",
    location: "Marché central, voie de Houndjro",
    lat: 7.178,
    lng: 2.067,
    description: "Amas de sachets et bouteilles au bord de la voie.",
    status: "En cours de vérification",
    priority: "Haute",
    provenance: "demo",
    rewardCredited: false,
    history: [
      { label: "Signalement reçu", date: "12 oct. · 08:42" },
      { label: "Vérification affectée", date: "12 oct. · 09:10" },
    ],
  },
  {
    id: "BC-2026-039",
    date: "11 oct. 2026",
    arrondissement: "Bohicon I",
    category: "Mixte",
    severity: "Moyenne",
    location: "Carrefour Zakpo",
    lat: 7.183,
    lng: 2.061,
    description: "Dépôt diffus sur un espace non bâti à proximité des habitations.",
    status: "Validé",
    priority: "Moyenne",
    provenance: "demo",
    rewardCredited: true,
    history: [
      { label: "Signalement reçu", date: "11 oct. · 16:18" },
      { label: "Signalement validé", date: "11 oct. · 17:06" },
      { label: "25 points attribués", date: "11 oct. · 17:06", note: "Crédit unique" },
    ],
  },
  {
    id: "BC-2026-035",
    date: "09 oct. 2026",
    arrondissement: "Bohicon III",
    category: "Organique",
    severity: "Élevée",
    location: "Abattoir — zone de regroupement",
    lat: 7.171,
    lng: 2.074,
    description: "Matières organiques en décomposition, à contrôler rapidement.",
    status: "Traité",
    priority: "Haute",
    provenance: "demo",
    rewardCredited: true,
    history: [
      { label: "Signalement reçu", date: "09 oct. · 07:28" },
      { label: "Intervention terminée", date: "10 oct. · 14:20" },
      { label: "Site marqué traité", date: "10 oct. · 15:02" },
    ],
  },
  {
    id: "BC-2026-031",
    date: "07 oct. 2026",
    arrondissement: "Bohicon IV",
    category: "Papier / carton",
    severity: "Faible",
    location: "École primaire de Sètovi",
    lat: 7.187,
    lng: 2.078,
    description: "Cartons accumulés après une livraison.",
    status: "Validé",
    priority: "Basse",
    provenance: "demo",
    rewardCredited: true,
    history: [{ label: "Signalement validé", date: "08 oct. · 10:31" }],
  },
  {
    id: "BC-2026-028",
    date: "05 oct. 2026",
    arrondissement: "Bohicon II",
    category: "Verre",
    severity: "Moyenne",
    location: "Rue des artisans",
    lat: 7.176,
    lng: 2.056,
    description: "Verre cassé mélangé à des déchets de rue.",
    status: "Doublon",
    priority: "Moyenne",
    provenance: "demo",
    rewardCredited: false,
    history: [{ label: "Doublon proposé", date: "06 oct. · 09:15", note: "Confirmation humaine requise" }],
  },
];

export const seedHubs: Hub[] = [
  { id: "HUB-01", name: "Point Agbokou", arrondissement: "Bohicon I", location: "Agbokou · rue 118", lat: 7.184, lng: 2.058, capacity: 78, received: 54, accepted: ["Plastique", "Métal", "Papier / carton"], hours: "07:00–18:00", operational: true },
  { id: "HUB-02", name: "Point Zongo", arrondissement: "Bohicon II", location: "Zongo · voie du marché", lat: 7.176, lng: 2.068, capacity: 120, received: 91, accepted: ["Organique", "Mixte", "Verre"], hours: "06:30–17:30", operational: true },
  { id: "HUB-03", name: "Point Sètovi", arrondissement: "Bohicon IV", location: "Sètovi · près de l’école", lat: 7.188, lng: 2.078, capacity: 60, received: 60, accepted: ["Papier / carton", "Plastique"], hours: "08:00–16:00", operational: false },
];

export const seedCollectors: Collector[] = [
  { id: "COL-014", name: "Issaka A.", zone: "Bohicon II · Zongo", status: "Actif", quality: 94, collectedKg: 184, earnings: 27600, availability: "Lun–Sam · matin" },
  { id: "COL-021", name: "Mariam T.", zone: "Bohicon I · Agbokou", status: "Actif", quality: 88, collectedKg: 142, earnings: 21300, availability: "Lun–Ven · journée" },
  { id: "COL-027", name: "Koffi G.", zone: "Bohicon III · Abattoir", status: "En formation", quality: 0, collectedKg: 0, earnings: 0, availability: "À définir" },
];

export const seedInterventions: Intervention[] = [
  { id: "INT-082", siteId: "BC-2026-041", site: "Marché central, voie de Houndjro", arrondissement: "Bohicon II", priority: "Haute", responsible: "Équipe Nord", plannedDate: "13 oct. 2026", status: "Planifiée", comment: "Débarrasser puis photographier avant/après.", history: [{ label: "Créée par la mairie", date: "12 oct. · 09:20" }] },
  { id: "INT-079", siteId: "BC-2026-035", site: "Abattoir — zone de regroupement", arrondissement: "Bohicon III", priority: "Haute", responsible: "Équipe Sud", plannedDate: "10 oct. 2026", status: "Terminée", comment: "Contrôle sanitaire à programmer.", history: [{ label: "Terminée", date: "10 oct. · 14:20" }] },
  { id: "INT-076", siteId: "BC-2026-031", site: "École primaire de Sètovi", arrondissement: "Bohicon IV", priority: "Basse", responsible: "Collecteur COL-021", plannedDate: "14 oct. 2026", status: "À contrôler", comment: "Vérifier le maintien de la propreté.", history: [{ label: "Passage effectué", date: "11 oct. · 11:45" }] },
];

export const seedCollections: Collection[] = [
  { id: "COLL-118", date: "12 oct. 2026", category: "Plastique", declaredKg: 42, verifiedKg: 40, validatedKg: 40, hub: "Point Agbokou", status: "Validée", paid: true },
  { id: "COLL-117", date: "11 oct. 2026", category: "Organique", declaredKg: 55, verifiedKg: 51, validatedKg: 51, hub: "Point Zongo", status: "Validée", paid: true },
  { id: "COLL-116", date: "10 oct. 2026", category: "Mixte", declaredKg: 28, verifiedKg: 27, validatedKg: null, hub: "Point Zongo", status: "Vérifiée", paid: false },
];

export function createInitialState(): DemoState {
  return {
    reports: seedReports,
    interventions: seedInterventions,
    hubs: seedHubs,
    collectors: seedCollectors,
    collections: seedCollections,
    points: 340,
    ledger: [
      { id: "LED-03", date: "11 oct. 2026", label: "Signalement BC-2026-039 validé", amount: 25, kind: "credit" },
      { id: "LED-02", date: "08 oct. 2026", label: "Badge Éclaireur débloqué", amount: -80, kind: "debit" },
      { id: "LED-01", date: "02 oct. 2026", label: "Signalement BC-2026-022 validé", amount: 25, kind: "credit" },
    ],
    importedLayers: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function formatFcfa(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

export function persistState(state: DemoState) {
  localStorage.setItem("bohicon-clean-demo", JSON.stringify({ ...state, lastUpdated: new Date().toISOString() }));
}

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem("bohicon-clean-demo");
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as DemoState;
    return { ...createInitialState(), ...parsed };
  } catch {
    return createInitialState();
  }
}
