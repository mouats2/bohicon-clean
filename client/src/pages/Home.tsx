import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  CloudUpload,
  Coins,
  FileCheck2,
  FileJson,
  FileText,
  Gauge,
  Layers3,
  Leaf,
  LineChart,
  LocateFixed,
  Map,
  MapPinned,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCcw,
  Recycle,
  Route,
  Scale,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Upload,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Toaster, toast } from "sonner";
import {
  CATEGORIES,
  type Attachment,
  type Collection,
  type DepotSauvage,
  type DemoState,
  type ImportedLayer,
  type Intervention,
  type Report,
  type ReportStatus,
  administrativeAreasFromGeoJSON,
  createInitialState,
  formatFcfa,
  loadState,
  persistState,
  terrainDepositsFromGeoJSON,
  uniqueId,
} from "@/lib/demo";
import {
  inspectionSummary,
  inspectGeoJSON,
  normalizeGeoJSONForDisplay,
  type GeoInspection,
} from "@/lib/geojson";
import {
  attachmentFromFile,
  isVideoAttachment,
  revokeAttachmentPreview,
  validateMediaFile,
} from "@/lib/media";
import {
  calculateMca,
  validateWeights,
  type CriterionDefinition,
} from "@/lib/multicriteria";
import { linkPointToAdministrativeArea } from "@/lib/spatial";
import { trpc } from "@/lib/trpc";
import { DEFAULT_SIGNALMENT_REWARD_POINTS } from "@shared/rules";
import { SIGNALMENT_STATUS_TRANSITIONS } from "@shared/status";

type Role = "public" | "citizen" | "collector" | "mairie" | "admin";
type ViewKey =
  | "overview"
  | "report"
  | "reports"
  | "points"
  | "rewards"
  | "map"
  | "training"
  | "collection"
  | "history"
  | "deposits"
  | "interventions"
  | "collectors"
  | "hubs"
  | "valorisation"
  | "analysis"
  | "intelligence"
  | "routes"
  | "reports-mairie"
  | "users"
  | "settings"
  | "imports";

const roleLabels: Record<Role, string> = {
  public: "Accueil public",
  citizen: "Espace citoyen",
  collector: "Espace collecteur",
  mairie: "Pilotage mairie",
  admin: "Administration",
};

const navByRole: Record<
  Exclude<Role, "public">,
  { key: ViewKey; label: string; icon: typeof Gauge }[]
> = {
  citizen: [
    { key: "overview", label: "Mon accueil", icon: Gauge },
    { key: "report", label: "Signaler", icon: Plus },
    { key: "reports", label: "Mes signalements", icon: ClipboardList },
    { key: "points", label: "Mes points", icon: Coins },
    { key: "rewards", label: "Récompenses", icon: Trophy },
    { key: "map", label: "Carte", icon: Map },
  ],
  collector: [
    { key: "overview", label: "Tableau de bord", icon: Gauge },
    { key: "training", label: "Formation & quiz", icon: BookOpen },
    { key: "collection", label: "Nouvelle collecte", icon: Recycle },
    { key: "history", label: "Historique des gains", icon: WalletCards },
    { key: "map", label: "Points de regroupement", icon: MapPinned },
  ],
  mairie: [
    { key: "overview", label: "Vue générale", icon: Gauge },
    { key: "map", label: "Carte opérationnelle", icon: Map },
    { key: "deposits", label: "Dépôts sauvages", icon: Trash2 },
    { key: "interventions", label: "Interventions", icon: ClipboardCheck },
    { key: "collectors", label: "Collecteurs", icon: Users },
    { key: "hubs", label: "Points de regroupement", icon: PackageCheck },
    { key: "valorisation", label: "Valorisation", icon: Recycle },
    { key: "analysis", label: "Analyses spatiales", icon: Layers3 },
    {
      key: "intelligence",
      label: "Intelligence & recommandations",
      icon: Sparkles,
    },
    { key: "routes", label: "Optimisation des tournées", icon: Route },
    { key: "reports-mairie", label: "Rapports", icon: FileText },
  ],
  admin: [
    { key: "overview", label: "Vue système", icon: Gauge },
    { key: "imports", label: "Importer des GeoJSON", icon: FileJson },
    { key: "users", label: "Utilisateurs & rôles", icon: Users },
    { key: "settings", label: "Paramètres de démo", icon: Settings2 },
  ],
};

const statusTone: Record<string, string> = {
  Validé: "green",
  Traité: "green",
  "En attente": "amber",
  "En cours de vérification": "blue",
  Rejeté: "red",
  Doublon: "purple",
  "À planifier": "amber",
  Planifiée: "blue",
  "En cours": "blue",
  Terminée: "green",
  "À contrôler": "amber",
  Actif: "green",
  "En formation": "amber",
  Suspendu: "red",
};

const statusLabel = (value: string) => (
  <span className={`status status-${statusTone[value] ?? "neutral"}`}>
    <span className="status-dot" />
    {value}
  </span>
);

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true">
        <Leaf size={18} strokeWidth={2.6} />
        <CircleDot size={8} className="brand-mark-dot" />
      </div>
      <div>
        <div className="brand-name">
          BOHICON <span>CLEAN</span>
        </div>
        {!compact && (
          <div className="brand-caption">Ville propre · action mesurable</div>
        )}
      </div>
    </div>
  );
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "blue" | "purple" | "red";
}) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function Kpi({
  label,
  value,
  detail,
  icon: Icon,
  tone = "green",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Gauge;
  tone?: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon kpi-${tone}`}>
        <Icon size={18} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-detail">{detail}</div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function DemoNotice({
  children = "Données terrain importées · source conservée",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="demo-notice">
      <Sparkles size={14} />
      <span>{children}</span>
    </div>
  );
}

function MiniTimeline({
  history,
}: {
  history: { label: string; date: string; note?: string }[];
}) {
  return (
    <div className="timeline">
      {history.map((event, index) => (
        <div className="timeline-item" key={`${event.label}-${index}`}>
          <span
            className={`timeline-dot ${index === history.length - 1 ? "timeline-dot-active" : ""}`}
          />
          <div>
            <strong>{event.label}</strong>
            <span>{event.date}</span>
            {event.note && <small>{event.note}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}

function OperationalMap({
  reports,
  hubs: _hubs,
  interventions: _interventions,
  importedLayers,
  compact = false,
  onSelect,
  editablePosition,
  onPositionChange,
}: {
  reports: Array<Report | DepotSauvage>;
  hubs: DemoState["hubs"];
  interventions: Intervention[];
  importedLayers: ImportedLayer[];
  compact?: boolean;
  onSelect?: (report: Report | DepotSauvage) => void;
  editablePosition?: [number, number] | null;
  onPositionChange?: (position: [number, number]) => void;
}) {
  const width = 1000;
  const height = compact ? 360 : 500;
  const boundaryFeatures = importedLayers.flatMap(layer => {
    const input = layer.geojson as any;
    return (input?.features ?? []).filter((feature: any) => {
      const type = feature?.geometry?.type;
      return type === "Polygon" || type === "MultiPolygon";
    });
  });
  const coordinates = reports.flatMap(report => [[report.lng, report.lat]]) as [
    number,
    number,
  ][];
  const collectCoordinates = (value: any): [number, number][] => {
    if (!Array.isArray(value)) return [];
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      return [[value[0], value[1]]];
    }
    return value.flatMap(collectCoordinates);
  };
  boundaryFeatures.forEach(feature =>
    coordinates.push(...collectCoordinates(feature.geometry?.coordinates))
  );
  if (editablePosition)
    coordinates.push([editablePosition[1], editablePosition[0]]);
  const rawBounds = coordinates.length
    ? coordinates.reduce(
        (bounds, [lng, lat]) => ({
          minLng: Math.min(bounds.minLng, lng),
          maxLng: Math.max(bounds.maxLng, lng),
          minLat: Math.min(bounds.minLat, lat),
          maxLat: Math.max(bounds.maxLat, lat),
        }),
        {
          minLng: Math.min(...coordinates.map(point => point[0])),
          maxLng: Math.max(...coordinates.map(point => point[0])),
          minLat: Math.min(...coordinates.map(point => point[1])),
          maxLat: Math.max(...coordinates.map(point => point[1])),
        }
      )
    : { minLng: 1.93, maxLng: 2.2, minLat: 7.05, maxLat: 7.32 };
  const lngPadding = Math.max(
    (rawBounds.maxLng - rawBounds.minLng) * 0.08,
    0.004
  );
  const latPadding = Math.max(
    (rawBounds.maxLat - rawBounds.minLat) * 0.08,
    0.004
  );
  const bounds = {
    minLng: rawBounds.minLng - lngPadding,
    maxLng: rawBounds.maxLng + lngPadding,
    minLat: rawBounds.minLat - latPadding,
    maxLat: rawBounds.maxLat + latPadding,
  };
  const project = ([lng, lat]: [number, number]) => ({
    x: ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width,
    y:
      height -
      ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height,
  });
  const pathForGeometry = (geometry: any) => {
    const polygons =
      geometry?.type === "Polygon"
        ? [geometry.coordinates]
        : geometry?.type === "MultiPolygon"
          ? geometry.coordinates
          : [];
    return polygons
      .flatMap((polygon: any[]) => polygon)
      .map((ring: any[]) => {
        const points = ring.map((point: [number, number]) => project(point));
        return points.length
          ? `${points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")} Z`
          : "";
      })
      .join(" ");
  };
  const visibleReports = compact ? reports.slice(0, 6) : reports;
  const handleMapClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!onPositionChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const y = ((event.clientY - rect.top) / rect.height) * height;
    const lng = bounds.minLng + (x / width) * (bounds.maxLng - bounds.minLng);
    const lat =
      bounds.minLat + ((height - y) / height) * (bounds.maxLat - bounds.minLat);
    onPositionChange([lat, lng]);
  };
  return (
    <div className={`map-card ${compact ? "map-compact" : ""}`}>
      <div className="map-toolbar">
        <div className="map-title">
          <Map size={16} /> Données terrain{" "}
          <Tag tone="green">Terrain + signalements</Tag>
        </div>
        <div className="map-tools">
          <span className="map-source-label">
            Aucun fond · données uniquement
          </span>
        </div>
      </div>
      <div className="map-canvas">
        <svg
          className="data-map-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Carte des limites d’arrondissements et des dépôts terrain de Bohicon"
          onClick={handleMapClick}
        >
          <rect width={width} height={height} className="data-map-surface" />
          {boundaryFeatures.map((feature, index) => (
            <path
              key={`boundary-${index}`}
              d={pathForGeometry(feature.geometry)}
              className="data-map-boundary"
            />
          ))}
          {visibleReports.map(report => {
            const point = project([report.lng, report.lat]);
            const isDepot = report.entityType === "depot";
            return (
              <circle
                key={report.id}
                cx={point.x}
                cy={point.y}
                r={compact ? 6 : 7}
                className={isDepot ? "data-map-depot" : "data-map-report"}
                tabIndex={0}
                role="button"
                aria-label={`${isDepot ? "Dépôt" : "Signalement"} ${report.location}`}
                onClick={event => {
                  event.stopPropagation();
                  onSelect?.(report);
                }}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ")
                    onSelect?.(report);
                }}
              >
                <title>
                  {report.id} · {report.location}
                </title>
              </circle>
            );
          })}
          {editablePosition && (
            <circle
              cx={project([editablePosition[1], editablePosition[0]]).x}
              cy={project([editablePosition[1], editablePosition[0]]).y}
              r={10}
              className="data-map-editable"
            >
              <title>Position du signalement</title>
            </circle>
          )}
          <text x="18" y="28" className="data-map-label">
            LIMITES ADMINISTRATIVES · BOHICON
          </text>
          {onPositionChange && (
            <text x="18" y={height - 18} className="data-map-hint">
              Cliquez sur la carte pour placer le signalement
            </text>
          )}
        </svg>
        <div className="map-legend">
          <span>
            <i className="legend-dot legend-blue" />
            Dépôts recensés
          </span>
          <span>
            <i className="legend-dot legend-red" />
            Signalements citoyens
          </span>
          <span>
            <i className="legend-imported" />
            Limites d’arrondissements
          </span>
        </div>
      </div>
    </div>
  );
}
function PublicHome({
  onRole,
  state,
}: {
  onRole: (role: Role, view?: ViewKey) => void;
  state: DemoState;
}) {
  const steps = [
    ["01", "Signaler", "Un citoyen documente un dépôt et le localise."],
    [
      "02",
      "Vérifier",
      "La mairie qualifie, priorise et affecte une intervention.",
    ],
    [
      "03",
      "Collecter",
      "Un collecteur transporte les matières vers un point identifié.",
    ],
    [
      "04",
      "Valoriser",
      "Les flux triés deviennent des données et des ressources.",
    ],
  ];
  return (
    <div className="public-page">
      <header className="public-header">
        <Brand />
        <nav>
          <a href="#fonctionnement">Fonctionnement</a>
          <a href="#parcours">Parcours</a>
          <a href="#apropos">À propos</a>
        </nav>
        <div className="public-actions">
          <button
            className="button button-ghost"
            onClick={() => onRole("citizen", "report")}
          >
            Signaler un dépôt <ArrowUpRight size={15} />
          </button>
          <button
            className="button button-dark"
            onClick={() => onRole("mairie")}
          >
            Espace mairie <ChevronRight size={15} />
          </button>
        </div>
      </header>
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <DemoNotice>
              Aucune statistique fictive · données terrain prioritaires
            </DemoNotice>
            <h1>
              Une ville propre commence par une <em>action visible.</em>
            </h1>
            <p className="hero-lead">
              BOHICON CLEAN relie les habitants, les collecteurs et la mairie
              pour transformer chaque signalement en décision, puis en résultat
              mesurable.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary button-large"
                onClick={() => onRole("citizen", "report")}
              >
                Signaler un dépôt <Send size={16} />
              </button>
              <button
                className="button button-outline button-large"
                onClick={() => onRole("collector", "training")}
              >
                Devenir collecteur <ChevronRight size={16} />
              </button>
            </div>
            <div className="hero-proof">
              <div>
                <strong>Couche terrain disponible</strong>
                <small>188 dépôts · 10 limites administratives</small>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-map-label">
              <span className="pulse-dot" /> Bohicon · données terrain
              uniquement
            </div>
            <OperationalMap
              reports={state.depots}
              hubs={state.hubs}
              interventions={state.interventions}
              importedLayers={state.importedLayers}
              compact
            />
          </div>
        </section>
        <section className="stat-strip">
          <div>
            <strong>188</strong>
            <span>dépôts terrain reçus</span>
          </div>
          <div>
            <strong>10</strong>
            <span>limites administratives</span>
          </div>
          <div>
            <strong>0</strong>
            <span>collecte fictive conservée</span>
          </div>
          <div>
            <strong>0</strong>
            <span>indicateur inventé</span>
          </div>
        </section>
        <section className="editorial-section" id="fonctionnement">
          <SectionHeading
            eyebrow="Le cycle BOHICON CLEAN"
            title="Du terrain à la décision."
            description="Les données reçues sont affichées avec leur provenance ; aucune valeur opérationnelle n’est inventée en l’absence de source."
          />
          <div className="step-grid">
            {steps.map(([number, title, body]) => (
              <div className="step-card" key={number}>
                <span>{number}</span>
                <div className="step-icon">
                  <Leaf size={18} />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
                <ChevronRight size={16} className="step-arrow" />
              </div>
            ))}
          </div>
        </section>
        <section className="split-section">
          <div>
            <div className="eyebrow">Une lecture commune du territoire</div>
            <h2>Les données ne restent pas dans un tableau.</h2>
            <p>
              Les dépôts et limites reçus sont affichés sans fond
              cartographique, avec leur provenance. Les flux de collecte
              apparaîtront uniquement après réception de données
              opérationnelles.
            </p>
            <button
              className="text-button"
              onClick={() => onRole("mairie", "overview")}
            >
              Explorer le pilotage municipal <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="category-panel">
            <div className="panel-title">
              <span>Catégories source</span>
              <Tag tone="green">En attente d’analyse</Tag>
            </div>
            {CATEGORIES.map((category, index) => (
              <div className="category-row" key={category}>
                <div className={`category-icon cat-${index}`}>
                  <Recycle size={15} />
                </div>
                <span>{category}</span>
                <div className="category-bar">
                  <i style={{ width: "0%" }} />
                </div>
                <strong>—</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="journey-section" id="parcours">
          <SectionHeading
            eyebrow="Trois parcours, une même mission"
            title="Chacun voit ce qui lui permet d’agir."
          />
          <div className="journey-grid">
            <button
              className="journey-card journey-citizen"
              onClick={() => onRole("citizen")}
            >
              <div className="journey-top">
                <span>01 · Citoyen</span>
                <MapPinned size={19} />
              </div>
              <h3>Je signale, je suis, je contribue.</h3>
              <p>
                Un parcours mobile-first pour documenter un dépôt, suivre sa
                résolution et gagner des points d’engagement.
              </p>
              <span className="journey-link">
                Ouvrir l’espace citoyen <ChevronRight size={15} />
              </span>
            </button>
            <button
              className="journey-card journey-collector"
              onClick={() => onRole("collector")}
            >
              <div className="journey-top">
                <span>02 · Collecteur</span>
                <Recycle size={19} />
              </div>
              <h3>Je collecte, je pèse, je valorise.</h3>
              <p>
                Formation, sécurité, points de regroupement, pesées vérifiées et
                gains transparents.
              </p>
              <span className="journey-link">
                Ouvrir l’espace collecteur <ChevronRight size={15} />
              </span>
            </button>
            <button
              className="journey-card journey-mairie"
              onClick={() => onRole("mairie")}
            >
              <div className="journey-top">
                <span>03 · Mairie</span>
                <BarChart3 size={19} />
              </div>
              <h3>Je vois, je priorise, je décide.</h3>
              <p>
                Une vue opérationnelle pour relier les signalements, les
                interventions, la collecte et l’analyse spatiale.
              </p>
              <span className="journey-link">
                Ouvrir le pilotage mairie <ChevronRight size={15} />
              </span>
            </button>
          </div>
        </section>
        <section className="about-section" id="apropos">
          <div className="about-mark">
            <Leaf size={42} />
            <span>BC</span>
          </div>
          <div>
            <div className="eyebrow">À propos du projet</div>
            <h2>Un prototype de génie urbain, ancré dans le réel.</h2>
            <p>
              BOHICON CLEAN est conçu comme une démonstration scientifique et
              fonctionnelle : les données de terrain à venir resteront
              prioritaires, traçables et distinctes des hypothèses de
              simulation.
            </p>
            <div className="about-pills">
              <Tag tone="green">Local-first</Tag>
              <Tag tone="blue">Cartographie</Tag>
              <Tag tone="amber">Décision assistée</Tag>
              <Tag>PostGIS-ready</Tag>
            </div>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Brand compact />
        <div>
          <span>Contact projet</span>
          <span>Confidentialité</span>
          <span>Conditions d’utilisation</span>
        </div>
        <small>© 2026 BOHICON CLEAN · Démonstration académique</small>
      </footer>
    </div>
  );
}

function AppShell({
  role,
  view,
  setRole,
  setView,
  children,
  onReset,
}: {
  role: Exclude<Role, "public">;
  view: ViewKey;
  setRole: (role: Role) => void;
  setView: (view: ViewKey) => void;
  children: ReactNode;
  onReset: () => void;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const items = navByRole[role];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Aller au contenu principal
      </a>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <Brand compact />
          <button
            className="icon-button mobile-close"
            aria-label="Fermer le menu"
            onClick={() => setMobileNav(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-role">
          <span className="role-kicker">Session locale</span>
          <strong>{roleLabels[role]}</strong>
          <span className="role-user">
            Identité à connecter · données locales
          </span>
        </div>
        <nav className="side-nav">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`side-link ${view === item.key ? "side-link-active" : ""}`}
                onClick={() => {
                  setView(item.key);
                  setMobileNav(false);
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="side-link"
            onClick={() => {
              setRole("public");
              setMobileNav(false);
            }}
          >
            <ArrowDownToLine size={17} />
            <span>Retour à l’accueil</span>
          </button>
          <button className="side-link muted-link" onClick={onReset}>
            <RefreshCcw size={16} />
            <span>Réinitialiser les données locales</span>
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="app-topbar">
          <button
            className="icon-button menu-button"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileNav(true)}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-context">
            <span className="topbar-kicker">Bohicon · Bénin</span>
            <strong>
              {view === "overview"
                ? "Vue d’ensemble"
                : (navByRole[role].find(item => item.key === view)?.label ??
                  "Espace de travail")}
            </strong>
          </div>
          <div className="topbar-actions">
            <div className="role-switch">
              <span>Voir comme</span>
              <select
                value={role}
                onChange={event => setRole(event.target.value as Role)}
              >
                <option value="citizen">Citoyen</option>
                <option value="collector">Collecteur</option>
                <option value="mairie">Mairie</option>
                <option value="admin">Administration</option>
              </select>
              <ChevronDown size={13} />
            </div>
            <button
              className="icon-button notification-button"
              aria-label="Voir les notifications"
            >
              <Bell size={17} />
              <i />
            </button>
            <div className="topbar-avatar">LC</div>
          </div>
        </header>
        <main id="main-content" className="app-content">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

function CitizenOverview({
  state,
  onView,
  onReport,
}: {
  state: DemoState;
  onView: (view: ViewKey) => void;
  onReport: () => void;
}) {
  const active = state.reports.filter(
    report => !["Traité", "Rejeté", "Doublon"].includes(report.status)
  ).length;
  return (
    <div className="workspace">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Espace citoyen · données locales</div>
          <h1>Votre ville, votre signal.</h1>
          <p>Un dépôt documenté devient une action mesurable.</p>
        </div>
        <button className="button button-primary" onClick={onReport}>
          <Plus size={16} /> Nouveau signalement
        </button>
      </div>
      <DemoNotice>
        Les points et récompenses restent nuls jusqu’à validation municipale.
      </DemoNotice>
      <div className="kpi-grid citizen-kpis">
        <Kpi
          label="Points disponibles"
          value={`${state.points}`}
          detail="Aucun crédit initial"
          icon={Coins}
          tone="amber"
        />
        <Kpi
          label="Signalements terrain"
          value={`${state.reports.length}`}
          detail={`${active} à traiter`}
          icon={ClipboardList}
          tone="green"
        />
        <Kpi
          label="Impact local"
          value="—"
          detail="Aucune estimation source"
          icon={Leaf}
          tone="blue"
        />
      </div>
      <div className="content-grid content-grid-2-1">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Derniers signalements</div>
              <h3>Votre activité récente</h3>
            </div>
            <button className="text-button" onClick={() => onView("reports")}>
              Tout voir <ChevronRight size={14} />
            </button>
          </div>
          <div className="report-list">
            {state.reports.slice(0, 3).map(report => (
              <button
                className="report-row"
                key={report.id}
                onClick={() => onView("reports")}
              >
                <div
                  className={`report-marker marker-${statusTone[report.status]}`}
                >
                  <MapPinned size={16} />
                </div>
                <div className="report-main">
                  <strong>{report.location}</strong>
                  <span>
                    {report.id} · {report.date} · {report.category}
                  </span>
                </div>
                <div>{statusLabel(report.status)}</div>
                <ChevronRight size={15} className="row-chevron" />
              </button>
            ))}
            {state.reports.length === 0 && (
              <div className="empty-state">
                <MapPinned size={22} />
                <h3>Aucun signalement local</h3>
                <p>Les signalements apparaîtront ici après saisie réelle.</p>
              </div>
            )}
          </div>
        </div>
        <div className="panel points-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Progression</div>
              <h3>Engagement citoyen</h3>
            </div>
            <Trophy size={20} className="panel-accent" />
          </div>
          <div className="level-ring">
            <div>
              <strong>{state.points}</strong>
              <span>points</span>
            </div>
          </div>
          <p>Aucun seuil ou récompense n’est prérempli.</p>
          <div className="progress">
            <i style={{ width: `${Math.min(state.points / 5, 100)}%` }} />
          </div>
          <button className="text-button" onClick={() => onView("rewards")}>
            Voir les règles <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <OperationalMap
        reports={[...state.depots, ...state.reports]}
        hubs={state.hubs}
        interventions={state.interventions}
        importedLayers={state.importedLayers}
        compact
      />
    </div>
  );
}

function ReportForm({
  onSubmit,
  onCancel,
  administrativeAreas,
}: {
  onSubmit: (report: Report) => void;
  onCancel: () => void;
  administrativeAreas: DemoState["administrativeAreas"];
}) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Plastique");
  const [severity, setSeverity] = useState<Report["severity"]>("Moyenne");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [arrondissement, setArrondissement] = useState(
    administrativeAreas[0]?.name ?? ""
  );
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mediaError, setMediaError] = useState("");
  const [gpsMessage, setGpsMessage] = useState("Aucune position demandée");
  const [formError, setFormError] = useState("");

  useEffect(
    () => () => attachments.forEach(revokeAttachmentPreview),
    [attachments]
  );

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const errors: string[] = [];
    const valid = files.flatMap(file => {
      const error = validateMediaFile(file);
      if (error) {
        errors.push(`${file.name} : ${error}`);
        return [];
      }
      return [attachmentFromFile(file)];
    });
    setMediaError(errors.join(" "));
    if (valid.length)
      setAttachments(current => [...current, ...valid].slice(0, 4));
    event.target.value = "";
  };
  const removeAttachment = (id: string) =>
    setAttachments(current => {
      const target = current.find(item => item.id === id);
      if (target) revokeAttachmentPreview(target);
      return current.filter(item => item.id !== id);
    });
  const requestGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage(
        "La géolocalisation n’est pas disponible sur ce navigateur."
      );
      return;
    }
    setGpsMessage("Demande d’autorisation en cours…");
    navigator.geolocation.getCurrentPosition(
      position => {
        const nextLat = Number(position.coords.latitude.toFixed(7));
        const nextLng = Number(position.coords.longitude.toFixed(7));
        setLat(nextLat);
        setLng(nextLng);
        setLocation(`Position GPS · ${nextLat}, ${nextLng}`);
        setGpsMessage(
          "Position GPS obtenue ; marqueur déplaçable sur la carte."
        );
      },
      error => {
        const detail =
          error.code === error.PERMISSION_DENIED
            ? "autorisation refusée"
            : error.code === error.TIMEOUT
              ? "délai dépassé"
              : "position indisponible";
        setGpsMessage(
          `GPS : ${detail}. Vous pouvez saisir les coordonnées manuellement.`
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  };
  const nextFromLocation = () => {
    if (
      !location.trim() ||
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180 ||
      !arrondissement.trim()
    ) {
      setFormError(
        "Renseignez un lieu, des coordonnées valides et un arrondissement de référence."
      );
      return;
    }
    setFormError("");
    setStep(3);
  };
  const nextFromDescription = () => {
    if (!description.trim()) {
      setFormError(
        "Une description est obligatoire pour qualifier le signalement."
      );
      return;
    }
    setFormError("");
    setStep(4);
  };
  const submit = () => {
    if (
      lat === null ||
      lng === null ||
      !location.trim() ||
      !description.trim() ||
      !arrondissement.trim()
    ) {
      setFormError("Certaines informations obligatoires sont manquantes.");
      return;
    }
    const now = new Date();
    onSubmit({
      entityType: "signalement",
      id: uniqueId("SIG"),
      createdAt: now.toISOString(),
      date: now.toISOString(),
      arrondissement,
      arrondissementSource: arrondissement,
      category,
      severity,
      location: location.trim(),
      lat,
      lng,
      description: description.trim(),
      status: "En attente",
      priority:
        severity === "Élevée"
          ? "Haute"
          : severity === "Moyenne"
            ? "Moyenne"
            : "Basse",
      provenance: "citizen",
      attachments,
      rewardCredited: false,
      history: [
        {
          label: "Signalement reçu",
          date: now.toISOString(),
          note: "En attente de vérification municipale",
          actorId: "citizen-local",
        },
      ],
    });
  };
  return (
    <div className="workspace narrow-workspace">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Nouveau signalement · Étape {step}/4</div>
          <h1>Documenter un dépôt.</h1>
          <p>
            Les données saisies restent distinctes de l’inventaire des dépôts
            recensés.
          </p>
        </div>
        <button className="icon-button" onClick={onCancel}>
          <X size={18} />
        </button>
      </div>
      <div className="stepper">
        <span className={step >= 1 ? "active" : ""}>
          <b>1</b> Médias
        </span>
        <i />
        <span className={step >= 2 ? "active" : ""}>
          <b>2</b> Localisation
        </span>
        <i />
        <span className={step >= 3 ? "active" : ""}>
          <b>3</b> Description
        </span>
        <i />
        <span className={step >= 4 ? "active" : ""}>
          <b>4</b> Vérifier
        </span>
      </div>
      <div className="form-panel">
        <DemoNotice>
          Une sélection locale n’est pas encore un téléversement : chaque pièce
          jointe porte son statut.
        </DemoNotice>
        {step === 1 && (
          <div className="form-section">
            <div className="upload-zone">
              <div className="upload-icon">
                <Camera size={21} />
              </div>
              <h3>Joindre une photo ou une vidéo</h3>
              <p>
                Formats JPG, PNG, WEBP, MP4, WEBM ou MOV · 10 Mo maximum par
                fichier.
              </p>
              <label className="button button-outline">
                <Upload size={16} /> Choisir des fichiers
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  multiple
                  onChange={onFiles}
                  hidden
                />
              </label>
            </div>
            {mediaError && (
              <div className="inline-error">
                <CircleAlert size={15} />
                {mediaError}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="attachment-grid">
                {attachments.map(item => (
                  <div className="attachment-card" key={item.id}>
                    {item.previewUrl &&
                      (isVideoAttachment(item) ? (
                        <video src={item.previewUrl} controls />
                      ) : (
                        <img src={item.previewUrl} alt={item.name} />
                      ))}
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {Math.ceil(item.size / 1024)} Ko · sélection locale
                      </span>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => removeAttachment(item.id)}
                      aria-label={`Supprimer ${item.name}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button className="text-button" onClick={onCancel}>
                Annuler
              </button>
              <button
                className="button button-primary"
                onClick={() => setStep(2)}
              >
                Continuer <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="form-section">
            <div className="location-preview">
              <OperationalMap
                reports={[]}
                hubs={[]}
                interventions={[]}
                importedLayers={[]}
                compact
                editablePosition={
                  lat !== null && lng !== null ? [lat, lng] : null
                }
                onPositionChange={position => {
                  setLat(Number(position[0].toFixed(7)));
                  setLng(Number(position[1].toFixed(7)));
                  setLocation(
                    `Position manuelle · ${position[0].toFixed(7)}, ${position[1].toFixed(7)}`
                  );
                }}
              />
              <div className="location-overlay">
                <LocateFixed size={16} />
                <span>{gpsMessage}</span>
              </div>
            </div>
            <div className="coordinate-grid">
              <div className="field">
                <label>Latitude</label>
                <input
                  value={lat ?? ""}
                  onChange={event =>
                    setLat(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  type="number"
                  step="0.0000001"
                  min="-90"
                  max="90"
                  placeholder="7.xxxxxxx"
                />
              </div>
              <div className="field">
                <label>Longitude</label>
                <input
                  value={lng ?? ""}
                  onChange={event =>
                    setLng(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  type="number"
                  step="0.0000001"
                  min="-180"
                  max="180"
                  placeholder="2.xxxxxxx"
                />
              </div>
            </div>
            <div className="field">
              <label>Lieu / quartier</label>
              <input
                value={location}
                onChange={event => setLocation(event.target.value)}
                placeholder="Ex. rue, marché, quartier"
              />
            </div>
            <div className="field">
              <label>Arrondissement déclaré</label>
              {administrativeAreas.length ? (
                <select
                  value={arrondissement}
                  onChange={event => setArrondissement(event.target.value)}
                >
                  <option value="">
                    Choisir dans la couche administrative
                  </option>
                  {administrativeAreas.map(area => (
                    <option key={area.key} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={arrondissement}
                  onChange={event => setArrondissement(event.target.value)}
                  placeholder="La couche administrative est en cours de chargement"
                />
              )}
            </div>
            <button className="button button-outline" onClick={requestGps}>
              <LocateFixed size={16} /> Utiliser ma position réelle
            </button>
            {formError && (
              <div className="inline-error">
                <CircleAlert size={15} />
                {formError}
              </div>
            )}
            <div className="form-actions">
              <button
                className="button button-ghost"
                onClick={() => setStep(1)}
              >
                Retour
              </button>
              <button
                className="button button-primary"
                onClick={nextFromLocation}
              >
                Continuer <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="form-section">
            <div className="field">
              <label>Description courte</label>
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Décrivez ce que vous observez…"
                rows={4}
              />
            </div>
            <div className="field">
              <label>Catégorie principale</label>
              <div className="choice-grid">
                {CATEGORIES.map(item => (
                  <button
                    key={item}
                    className={`choice-button ${category === item ? "choice-selected" : ""}`}
                    onClick={() => setCategory(item)}
                  >
                    <Recycle size={15} />
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Niveau apparent de gravité</label>
              <div className="severity-row">
                {(["Faible", "Moyenne", "Élevée"] as const).map(item => (
                  <button
                    key={item}
                    className={`severity-button severity-${item.toLowerCase()} ${severity === item ? "selected" : ""}`}
                    onClick={() => setSeverity(item)}
                  >
                    <span />
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Message vocal (optionnel)</label>
              <p className="field-help">
                L’enregistrement vocal nécessite un service de
                stockage/transcription connecté ; aucun fichier vocal n’est
                déclaré envoyé dans ce mode local.
              </p>
            </div>
            {formError && (
              <div className="inline-error">
                <CircleAlert size={15} />
                {formError}
              </div>
            )}
            <div className="form-actions">
              <button
                className="button button-ghost"
                onClick={() => setStep(2)}
              >
                Retour
              </button>
              <button
                className="button button-primary"
                onClick={nextFromDescription}
              >
                Vérifier <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="form-section">
            <div className="review-card">
              <div className="review-icon">
                <FileCheck2 size={21} />
              </div>
              <div>
                <div className="eyebrow">Prêt à envoyer</div>
                <h3>
                  {category} · gravité {severity.toLowerCase()}
                </h3>
                <p>
                  {location} · {lat}, {lng}
                </p>
                <span>{description}</span>
              </div>
            </div>
            <div className="review-grid">
              <div>
                <span>Photo / vidéo</span>
                <strong>
                  {attachments.length
                    ? `${attachments.length} sélectionnée(s), local`
                    : "Non fournie"}
                </strong>
              </div>
              <div>
                <span>Position</span>
                <strong>
                  {lat !== null && lng !== null
                    ? "Coordonnées enregistrées"
                    : "Manquante"}
                </strong>
              </div>
              <div>
                <span>Arrondissement</span>
                <strong>{arrondissement || "Non renseigné"}</strong>
              </div>
              <div>
                <span>Statut après envoi</span>
                <strong>En attente de vérification</strong>
              </div>
            </div>
            <DemoNotice>
              La récompense éventuelle est une règle configurable et n’est
              attribuée qu’après validation autorisée, une seule fois.
            </DemoNotice>
            {formError && (
              <div className="inline-error">
                <CircleAlert size={15} />
                {formError}
              </div>
            )}
            <div className="form-actions">
              <button
                className="button button-ghost"
                onClick={() => setStep(3)}
              >
                Modifier
              </button>
              <button
                className="button button-primary button-large"
                onClick={submit}
              >
                <Send size={16} /> Envoyer le signalement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CitizenReports({
  reports,
  onView,
}: {
  reports: Report[];
  onView: (view: ViewKey) => void;
}) {
  const [filter, setFilter] = useState("Tous");
  const list =
    filter === "Tous"
      ? reports
      : reports.filter(report => report.status === filter);
  return (
    <div className="workspace">
      <SectionHeading
        eyebrow="Espace citoyen"
        title="Mes signalements"
        description="Suivez chaque dépôt, son statut et la suite donnée par la mairie."
        action={
          <button
            className="button button-primary"
            onClick={() => onView("report")}
          >
            <Plus size={16} /> Signaler
          </button>
        }
      />
      <div className="filter-bar">
        <Search size={16} />
        <input placeholder="Rechercher un lieu ou un identifiant" />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option>Tous</option>
          {[
            "En attente",
            "En cours de vérification",
            "Validé",
            "Traité",
            "Doublon",
            "Rejeté",
          ].map(item => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className="icon-button">
          <SlidersHorizontal size={16} />
        </button>
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Signalement</th>
                <th>Localisation</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Dernier événement</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map(report => (
                <tr key={report.id}>
                  <td>
                    <strong>{report.id}</strong>
                    <span>
                      {report.date} ·{" "}
                      {report.provenance === "demo"
                        ? "Démonstration"
                        : "Terrain"}
                    </span>
                  </td>
                  <td>
                    {report.location}
                    <span>{report.arrondissement}</span>
                  </td>
                  <td>
                    <Tag tone="green">{report.category}</Tag>
                  </td>
                  <td>{statusLabel(report.status)}</td>
                  <td>
                    {report.history.at(-1)?.label}
                    <span>{report.history.at(-1)?.date}</span>
                  </td>
                  <td>
                    <button className="icon-button">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PointsWallet({
  state,
  onView,
}: {
  state: DemoState;
  onView: (view: ViewKey) => void;
}) {
  const level = Math.floor(state.points / 100) + 1;
  const nextTarget = level * 100;
  const progress = Math.min(100, Math.round((state.points / nextTarget) * 100));
  return (
    <div className="workspace">
      <SectionHeading
        eyebrow="Portefeuille citoyen"
        title="Mes points & récompenses"
        description="Les crédits sont attribués uniquement après validation d’un signalement."
        action={
          <button
            className="button button-outline"
            onClick={() => onView("rewards")}
          >
            <Trophy size={16} /> Voir les récompenses
          </button>
        }
      />
      <div className="wallet-hero">
        <div>
          <span className="eyebrow">Solde disponible</span>
          <strong>{state.points}</strong>
          <span>points d’engagement</span>
        </div>
        <div className="wallet-orbit">
          <Coins size={31} />
        </div>
        <div className="wallet-level">
          <span>Niveau {level}</span>
          <strong>
            {state.points ? "Engagement confirmé" : "Aucun niveau atteint"}
          </strong>
          <div className="progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <small>
            {Math.max(0, nextTarget - state.points)} points avant le prochain
            niveau
          </small>
        </div>
      </div>
      <div className="content-grid content-grid-1-1">
        <div className="panel">
          <div className="panel-header">
            <h3>Historique du portefeuille</h3>
            <Tag tone="blue">Anti-double-crédit actif</Tag>
          </div>
          <div className="ledger">
            {state.ledger.map(entry => (
              <div className="ledger-row" key={entry.id}>
                <div
                  className={`ledger-icon ${entry.kind === "credit" ? "ledger-credit" : "ledger-debit"}`}
                >
                  {entry.kind === "credit" ? (
                    <ArrowUpRight size={15} />
                  ) : (
                    <ArrowDownToLine size={15} />
                  )}
                </div>
                <div>
                  <strong>{entry.label}</strong>
                  <span>{entry.date}</span>
                </div>
                <b
                  className={entry.kind === "credit" ? "positive" : "negative"}
                >
                  {entry.kind === "credit" ? "+" : ""}
                  {entry.amount} pts
                </b>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Règles de confiance</h3>
            <ShieldCheck size={20} className="panel-accent" />
          </div>
          <div className="trust-list">
            <div>
              <CheckCircle2 size={16} />
              <span>Un signalement = un identifiant unique</span>
            </div>
            <div>
              <CheckCircle2 size={16} />
              <span>Validation mairie avant tout crédit</span>
            </div>
            <div>
              <CheckCircle2 size={16} />
              <span>Historique conservé pour chaque action</span>
            </div>
            <div>
              <CheckCircle2 size={16} />
              <span>Récompenses simulées, confirmation requise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rewards() {
  const rewards = [
    {
      title: "Panier local",
      cost: 500,
      note: "Produits issus d’une filière locale",
      icon: "PL",
    },
    {
      title: "Kit propreté",
      cost: 800,
      note: "Gants + sacs réutilisables",
      icon: "KP",
    },
    {
      title: "Badge Ambassadeur",
      cost: 1200,
      note: "Reconnaissance citoyenne",
      icon: "BA",
    },
  ];
  return (
    <div className="workspace">
      <SectionHeading
        eyebrow="Récompenses simulées"
        title="Faire du propre une habitude."
        description="Ces contreparties sont fictives dans ce prototype et nécessitent une confirmation avant utilisation."
      />
      <div className="reward-grid">
        {rewards.map(reward => (
          <div className="reward-card" key={reward.title}>
            <div className="reward-symbol">{reward.icon}</div>
            <Tag tone={reward.cost <= 500 ? "green" : "amber"}>
              {reward.cost} pts
            </Tag>
            <h3>{reward.title}</h3>
            <p>{reward.note}</p>
            <button
              className="button button-outline"
              onClick={() =>
                toast.info("Confirmation simulée", {
                  description: `La récompense « ${reward.title} » serait confirmée dans une version connectée.`,
                })
              }
            >
              Utiliser mes points <ArrowUpRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectorOverview({
  state,
  onView,
}: {
  state: DemoState;
  onView: (view: ViewKey) => void;
}) {
  const validated = state.collections.reduce(
    (sum, item) => sum + (item.validatedKg ?? 0),
    0
  );
  const collector =
    state.collectors.find(item => item.authorized) ?? state.collectors[0];
  const authorized = collector?.applicationStatus === "Autorisée";
  return (
    <div className="workspace">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Espace collecteur · compte local</div>
          <h1>
            {collector ? `Bonjour ${collector.name}.` : "Devenir collecteur."}
          </h1>
          <p>
            Une collecte opérationnelle nécessite un dossier, une formation
            validée et une autorisation active.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => onView("collection")}
        >
          <Plus size={16} /> Nouvelle collecte
        </button>
      </div>
      <DemoNotice>
        {authorized
          ? "Votre autorisation est active selon le profil local."
          : "Aucun collecteur autorisé n’est actuellement enregistré ; aucune collecte opérationnelle ne sera acceptée."}
      </DemoNotice>
      <div className="kpi-grid">
        <Kpi
          label="Quantité validée"
          value={`${validated} kg`}
          detail="Somme des pesées validées"
          icon={Scale}
          tone="green"
        />
        <Kpi
          label="Gains cumulés"
          value="—"
          detail="Tarif non configuré"
          icon={Coins}
          tone="amber"
        />
        <Kpi
          label="Note qualité"
          value="—"
          detail="Aucun résultat de formation persistant"
          icon={ShieldCheck}
          tone="blue"
        />
        <Kpi
          label="Autorisation"
          value={authorized ? "Active" : "Non vérifiée"}
          detail={collector?.applicationStatus ?? "Dossier absent"}
          icon={authorized ? CheckCircle2 : CircleAlert}
          tone={authorized ? "green" : "amber"}
        />
      </div>
      <div className="content-grid content-grid-2-1">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Dernières collectes</div>
              <h3>Quantités à confirmer</h3>
            </div>
            <button className="text-button" onClick={() => onView("history")}>
              Historique <ChevronRight size={14} />
            </button>
          </div>
          <CollectionTable collections={state.collections.slice(0, 3)} />
        </div>
        <div className="panel training-card">
          <div className="training-icon">
            <BookOpen size={23} />
          </div>
          <Tag tone="amber">Formation requise</Tag>
          <h3>Sécurité & tri</h3>
          <p>
            Le résultat du quiz est calculé à partir de vos réponses et
            enregistré après validation.
          </p>
          <button className="text-button" onClick={() => onView("training")}>
            Ouvrir la formation <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <div className="content-grid content-grid-1-1">
        <OperationalMap
          reports={[...state.depots, ...state.reports]}
          hubs={state.hubs}
          interventions={state.interventions}
          importedLayers={state.importedLayers}
          compact
        />
        <div className="panel tariff-panel">
          <div className="panel-header">
            <h3>Tarification</h3>
            <Tag tone="amber">Non configurée</Tag>
          </div>
          <div className="empty-state">
            <Coins size={20} />
            <p>
              Aucun montant n’est présenté tant qu’une grille municipale
              versionnée n’est pas configurée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionTable({ collections }: { collections: Collection[] }) {
  return (
    <div className="collection-list">
      {collections.map(collection => (
        <div className="collection-row" key={collection.id}>
          <div className="collection-date">
            <strong>{collection.date.split(" ")[0]}</strong>
            <span>{collection.date.split(" ").slice(1).join(" ")}</span>
          </div>
          <div>
            <strong>{collection.category}</strong>
            <span>
              {collection.hub} · {collection.id}
            </span>
          </div>
          <div className="quantity-stack">
            <span>
              Déclarée <b>{collection.declaredKg} kg</b>
            </span>
            <span>
              Vérifiée <b>{collection.verifiedKg ?? "—"} kg</b>
            </span>
            <span>
              Validée <b>{collection.validatedKg ?? "—"} kg</b>
            </span>
          </div>
          {statusLabel(collection.status)}
        </div>
      ))}
    </div>
  );
}

function Training() {
  const questions = [
    {
      text: "Quel équipement protège les mains lors de la collecte ?",
      options: ["Gants adaptés", "Bijoux", "Aucun équipement"],
      correct: 0,
    },
    {
      text: "Que faire d’un déchet médical piquant ?",
      options: [
        "Le trier à mains nues",
        "Suivre le protocole dédié",
        "Le mélanger aux organiques",
      ],
      correct: 1,
    },
    {
      text: "Pourquoi séparer les matières au point de regroupement ?",
      options: [
        "Préparer le tri et la valorisation",
        "Augmenter les risques",
        "Cacher la provenance",
      ],
      correct: 0,
    },
    {
      text: "Quelle information doit accompagner une pesée ?",
      options: [
        "Un identifiant de collecte",
        "Une estimation orale seulement",
        "Aucune information",
      ],
      correct: 0,
    },
    {
      text: "Que faire en cas de fuite d’un sac ?",
      options: [
        "Isoler et appliquer le protocole",
        "Continuer sans protection",
        "Le déposer n’importe où",
      ],
      correct: 0,
    },
    {
      text: "Un verre cassé se manipule-t-il à mains nues ?",
      options: ["Oui", "Non, avec protection adaptée", "Seulement la nuit"],
      correct: 1,
    },
    {
      text: "Quel est le rôle d’un gilet visible ?",
      options: [
        "Être repérable sur la voie publique",
        "Remplacer les gants",
        "Peser les déchets",
      ],
      correct: 0,
    },
    {
      text: "Quand peut-on déclarer une collecte terminée ?",
      options: [
        "Après dépôt et enregistrement",
        "Avant le départ",
        "Sans point identifié",
      ],
      correct: 0,
    },
    {
      text: "Pourquoi éviter de compacter un déchet dangereux ?",
      options: ["Limiter les accidents", "Gagner du temps", "Ne rien changer"],
      correct: 0,
    },
    {
      text: "Que faire si un point est à capacité ?",
      options: [
        "Le signaler et suivre une alternative autorisée",
        "Déposer au sol",
        "Forcer l’accès",
      ],
      correct: 0,
    },
  ];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = Math.round(
    (questions.filter((question, index) => answers[index] === question.correct)
      .length /
      questions.length) *
      100
  );
  const save = () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Répondez aux 10 questions avant de valider");
      return;
    }
    setSubmitted(true);
    toast.success("Résultat calculé", {
      description: `${score}% · seuil configuré à 80%.`,
    });
  };
  return (
    <div className="workspace">
      <SectionHeading
        eyebrow="Parcours collecteur"
        title="Formation & quiz sécurité"
        description="Le seuil de réussite est fixé à 80 %. Le score est calculé à partir des réponses choisies."
        action={
          <Tag tone={submitted && score >= 80 ? "green" : "amber"}>
            {submitted
              ? `${score}% · ${score >= 80 ? "Réussi" : "À reprendre"}`
              : "Non soumis"}
          </Tag>
        }
      />
      <div className="training-layout">
        <div className="panel training-content">
          <div className="training-banner">
            <ShieldCheck size={24} />
            <div>
              <strong>Les bons réflexes protègent toute la chaîne.</strong>
              <span>EPI · risques · tri · transport · déchets dangereux</span>
            </div>
          </div>
          <div className="quiz-list">
            {questions.map((question, index) => (
              <div className="quiz-row quiz-row-select" key={question.text}>
                <div className="quiz-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <strong>{question.text}</strong>
                  <select
                    value={answers[index] ?? ""}
                    onChange={event => {
                      setSubmitted(false);
                      setAnswers(current => ({
                        ...current,
                        [index]:
                          event.target.value === ""
                            ? -1
                            : Number(event.target.value),
                      }));
                    }}
                  >
                    <option value="">Choisir une réponse</option>
                    {question.options.map((option, optionIndex) => (
                      <option key={option} value={optionIndex}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button className="button button-primary" onClick={save}>
            <CheckCircle2 size={16} /> Calculer et enregistrer
          </button>
        </div>
        <div className="panel training-side">
          <div className="eyebrow">Résultat</div>
          <div className="big-score">
            {submitted ? score : "—"}
            <small>{submitted ? "%" : ""}</small>
          </div>
          <div className="progress">
            <i style={{ width: `${submitted ? score : 0}%` }} />
          </div>
          <p>
            {!submitted
              ? "Répondez à toutes les questions."
              : score >= 80
                ? "Seuil atteint : la formation peut être soumise à validation."
                : "Seuil non atteint : recommencez le quiz."}
          </p>
          <div className="safety-note">
            <CircleAlert size={16} />
            <span>
              Ne jamais manipuler les déchets dangereux sans protocole ni
              équipement adapté.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewCollection({
  state,
  onSaved,
}: {
  state: DemoState;
  onSaved: (collection: Collection) => void;
}) {
  const [category, setCategory] = useState("Plastique");
  const [declared, setDeclared] = useState("");
  const verifiedHubs = state.hubs.filter(
    item => item.verified && item.operational !== false
  );
  const [hub, setHub] = useState(verifiedHubs[0]?.name ?? "");
  const [submitted, setSubmitted] = useState(false);
  const save = () => {
    const amount = Number(declared);
    if (!hub || !Number.isFinite(amount) || amount <= 0) {
      toast.error(
        "Sélectionnez un point vérifié et renseignez une quantité positive"
      );
      return;
    }
    const now = new Date().toISOString();
    const target = verifiedHubs.find(item => item.name === hub);
    const collection: Collection = {
      entityType: "collecte",
      id: uniqueId("COLL"),
      createdAt: now,
      date: now,
      category,
      declaredKg: amount,
      verifiedKg: null,
      validatedKg: null,
      hub,
      hubId: target?.id,
      status: "Déclarée",
      paid: false,
      history: [
        {
          label: "Collecte déclarée",
          date: now,
          note: "Pesée et validation indépendantes requises",
        },
      ],
    };
    onSaved(collection);
    setSubmitted(true);
  };
  return (
    <div className="workspace narrow-workspace">
      <SectionHeading
        eyebrow="Nouvelle collecte"
        title="Déclarer une collecte."
        description="La quantité vérifiée puis validée par un acteur habilité sera la seule à produire un bilan."
      />
      <div className="form-panel">
        {submitted ? (
          <div className="success-state">
            <div className="success-icon">
              <CheckCircle2 size={29} />
            </div>
            <div className="eyebrow">Collecte enregistrée</div>
            <h2>Votre déclaration est en attente de pesée.</h2>
            <p>
              Le point <strong>{hub}</strong> doit confirmer la quantité avant
              toute validation.
            </p>
            <button
              className="button button-primary"
              onClick={() => setSubmitted(false)}
            >
              Déclarer une autre collecte
            </button>
          </div>
        ) : (
          <>
            <div className="form-section">
              <div className="field">
                <label>Catégories transportées</label>
                <div className="choice-grid">
                  {CATEGORIES.slice(0, 6).map(item => (
                    <button
                      key={item}
                      className={`choice-button ${category === item ? "choice-selected" : ""}`}
                      onClick={() => setCategory(item)}
                    >
                      <Recycle size={15} />
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Quantité déclarée (kg)</label>
                <div className="input-with-suffix">
                  <input
                    value={declared}
                    onChange={event => setDeclared(event.target.value)}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Quantité observée"
                  />
                  <span>kg</span>
                </div>
              </div>
              <div className="field">
                <label>Point de regroupement vérifié</label>
                {verifiedHubs.length ? (
                  <div className="hub-options">
                    {verifiedHubs.map(item => (
                      <button
                        key={item.id}
                        className={`hub-option ${hub === item.name ? "hub-selected" : ""}`}
                        onClick={() => setHub(item.name)}
                      >
                        <div>
                          <strong>{item.name}</strong>
                          <span>
                            {item.location} · opérationnel selon la source
                          </span>
                          <small>{item.accepted.join(" · ")}</small>
                        </div>
                        <div className="hub-capacity">
                          <b>
                            {item.capacity !== null && item.received !== null
                              ? `${item.capacity - item.received} kg`
                              : "Capacité inconnue"}
                          </b>
                          <span>capacité source</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <MapPinned size={22} />
                    <h3>Aucun point vérifié disponible</h3>
                    <p>
                      La déclaration opérationnelle est bloquée tant qu’un point
                      officiel et vérifié n’est pas enregistré.
                    </p>
                  </div>
                )}
              </div>
              <DemoNotice>
                Les distances routières, tarifs et gains ne sont pas présentés
                sans données opérationnelles configurées.
              </DemoNotice>
              <div className="form-actions">
                <button
                  className="button button-primary"
                  onClick={save}
                  disabled={!verifiedHubs.length}
                >
                  <Scale size={16} /> Enregistrer la déclaration
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CollectorHistory({ collections }: { collections: Collection[] }) {
  return (
    <div className="workspace">
      <SectionHeading
        eyebrow="Transparence des gains"
        title="Historique des collectes"
        description="Déclarée, vérifiée, validée : les trois quantités restent visibles."
        action={<Tag tone="amber">Tarifs fictifs</Tag>}
      />
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Collecte</th>
                <th>Flux</th>
                <th>Point</th>
                <th>Déclarée</th>
                <th>Vérifiée</th>
                <th>Validée</th>
                <th>Gain</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {collections.map(item => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                    <span>{item.date}</span>
                  </td>
                  <td>
                    <Tag tone="green">{item.category}</Tag>
                  </td>
                  <td>{item.hub}</td>
                  <td>{item.declaredKg} kg</td>
                  <td>{item.verifiedKg ?? "—"}</td>
                  <td>{item.validatedKg ?? "—"}</td>
                  <td>
                    <strong>
                      {item.validatedKg !== null
                        ? "Tarif à calculer"
                        : "En attente"}
                    </strong>
                  </td>
                  <td>{statusLabel(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MairieOverview({
  state,
  onView,
  onStatus,
}: {
  state: DemoState;
  onView: (view: ViewKey) => void;
  onStatus: (id: string, status: ReportStatus) => void;
}) {
  const records: Array<Report | DepotSauvage> = [
    ...state.depots,
    ...state.reports,
  ];
  const openReports = state.reports.filter(
    item => !["Traité", "Rejeté", "Doublon"].includes(item.status)
  ).length;
  const highDeposits = state.depots.filter(item => item.priority === "Haute");
  const categoryData = CATEGORIES.slice(0, 5).map(category => ({
    name: category.split(" ")[0],
    value: records.filter(record => record.category === category).length,
  }));
  const trendData = Array.from(
    new Set(
      state.reports
        .map(item => item.date.slice(0, 10))
        .concat(state.interventions.map(item => item.plannedDate.slice(0, 10)))
    )
  )
    .sort()
    .slice(-7)
    .map(day => ({
      day: day.slice(5),
      signalements: state.reports.filter(item => item.date.slice(0, 10) === day)
        .length,
      interventions: state.interventions.filter(
        item => item.plannedDate.slice(0, 10) === day
      ).length,
    }));
  return (
    <div className="workspace mairie-workspace">
      <div className="page-intro">
        <div>
          <div className="eyebrow">Pilotage municipal · données reçues</div>
          <h1>Voir le terrain. Décider juste.</h1>
          <p>
            Les inventaires, signalements et opérations sont affichés avec leur
            provenance.
          </p>
        </div>
        <div className="intro-actions">
          <button
            className="button button-outline"
            onClick={() => onView("reports-mairie")}
          >
            <FileText size={16} /> Rapports
          </button>
          <button
            className="button button-primary"
            onClick={() => onView("interventions")}
          >
            <Plus size={16} /> Créer une intervention
          </button>
        </div>
      </div>
      <DemoNotice>
        Les indicateurs sont calculés à partir des 188 dépôts source, des
        signalements citoyens saisis et des opérations enregistrées.
      </DemoNotice>
      <div className="kpi-grid mairie-kpis">
        <Kpi
          label="Dépôts recensés"
          value={`${state.depots.length}`}
          detail="Inventaire terrain · source originale"
          icon={Trash2}
          tone="green"
        />
        <Kpi
          label="Signalements citoyens"
          value={`${state.reports.length}`}
          detail={`${openReports} encore ouverts`}
          icon={ClipboardList}
          tone="amber"
        />
        <Kpi
          label="À contrôler"
          value={`${state.depots.filter(item => item.status === "Recensé").length}`}
          detail="Inventaire non confirmé"
          icon={CircleAlert}
          tone="red"
        />
        <Kpi
          label="Sites prioritaires"
          value={`${highDeposits.length}`}
          detail="Gravité/volume source"
          icon={Target}
          tone="amber"
        />
        <Kpi
          label="Collecteurs autorisés"
          value={`${state.collectors.filter(item => item.authorized && item.status === "Actif").length}`}
          detail="Profils vérifiés uniquement"
          icon={Users}
          tone="green"
        />
        <Kpi
          label="Quantités validées"
          value={`${state.collections.reduce((sum, item) => sum + (item.validatedKg ?? 0), 0)} kg`}
          detail="Pesées validées seulement"
          icon={Scale}
          tone="blue"
        />
      </div>
      <div className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Tendance enregistrée</div>
              <h3>Signalements & interventions</h3>
            </div>
            <Tag tone="blue">Vide si aucune date</Tag>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <RechartsLineChart
              data={trendData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e3ebe5"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#748178" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#748178" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #dfe9e0",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="signalements"
                name="Signalements"
                stroke="#0e4f3c"
                strokeWidth={3}
                dot={{ r: 3, fill: "#0e4f3c" }}
              />
              <Line
                type="monotone"
                dataKey="interventions"
                name="Interventions"
                stroke="#d9a441"
                strokeWidth={3}
                dot={{ r: 3, fill: "#d9a441" }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Répartition source</div>
              <h3>Catégories observées</h3>
            </div>
            <Tag tone="green">Dépôts + signalements</Tag>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart
              data={categoryData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e3ebe5"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#748178" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#748178" }}
              />
              <Tooltip
                cursor={{ fill: "#f2f6f1" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #dfe9e0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" name="Occurrences" radius={[6, 6, 0, 0]}>
                {categoryData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={
                      ["#0e4f3c", "#8bbd78", "#d9a441", "#c9d98b", "#67877a"][
                        index
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="content-grid content-grid-2-1">
        <OperationalMap
          reports={records}
          hubs={state.hubs}
          interventions={state.interventions}
          importedLayers={state.importedLayers}
          onSelect={() => onView("deposits")}
        />
        <div className="panel priority-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">À examiner</div>
              <h3>Sites prioritaires</h3>
            </div>
            <button className="text-button" onClick={() => onView("deposits")}>
              Voir tous <ChevronRight size={14} />
            </button>
          </div>
          {highDeposits.slice(0, 3).map(depot => (
            <div className="priority-row" key={depot.id}>
              <div className="priority-score">
                {depot.severity === "Élevée" ? "A" : "B"}
              </div>
              <div>
                <strong>{depot.location}</strong>
                <span>
                  {depot.id} · {depot.arrondissementSource}
                </span>
              </div>
              <span className="source-note-inline">Inventaire</span>
            </div>
          ))}
          {!highDeposits.length && (
            <div className="empty-state">
              <Target size={20} />
              <p>Aucun site de priorité haute dans les données disponibles.</p>
            </div>
          )}
          <div className="priority-footer">
            <Sparkles size={14} /> Priorité descriptive basée sur les attributs
            source ; elle doit être confirmée.
          </div>
        </div>
      </div>
    </div>
  );
}

function Deposits({
  state,
  onStatus,
}: {
  state: DemoState;
  onStatus: (id: string, status: ReportStatus) => void;
}) {
  const [query, setQuery] = useState("");
  const [arrondissement, setArrondissement] = useState("Tous");
  const [selected, setSelected] = useState<Report | DepotSauvage | null>(null);
  const records: Array<Report | DepotSauvage> = [
    ...state.depots,
    ...state.reports,
  ];
  const availableArrondissements = Array.from(
    new Set(
      state.administrativeAreas
        .map(area => area.name)
        .concat(records.map(record => record.arrondissement))
    )
  ).sort();
  const list = records
    .filter(record =>
      `${record.location} ${record.id} ${record.category}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .filter(
      record =>
        arrondissement === "Tous" || record.arrondissement === arrondissement
    );
  const isDepot = selected?.entityType === "depot";
  return (
    <div className="workspace mairie-workspace">
      <SectionHeading
        eyebrow="Inventaire et signalements"
        title="Dépôts sauvages"
        description="Les dépôts recensés et les signalements citoyens conservent leur identité propre ; aucun doublon n’est fusionné automatiquement."
        action={
          <Tag tone="green">
            {records.length} entités · {state.depots.length} inventaire
          </Tag>
        }
      />
      <div className="filter-bar">
        <Search size={16} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Rechercher un lieu, un code ou une catégorie"
        />
        <select
          value={arrondissement}
          onChange={event => setArrondissement(event.target.value)}
        >
          <option>Tous</option>
          {availableArrondissements.map(item => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className="button button-outline">
          <SlidersHorizontal size={15} /> Filtres
        </button>
      </div>
      <div className="deposits-layout">
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Type / provenance</th>
                  <th>Catégorie</th>
                  <th>Priorité</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map(record => {
                  const depot = record.entityType === "depot";
                  return (
                    <tr
                      key={`${record.entityType}-${record.id}`}
                      className={
                        selected?.id === record.id ? "row-selected" : ""
                      }
                    >
                      <td>
                        <button
                          className="table-link"
                          onClick={() => setSelected(record)}
                        >
                          <strong>{record.location}</strong>
                          <span>
                            {record.id} · {record.date}
                          </span>
                        </button>
                      </td>
                      <td>
                        <Tag tone={depot ? "blue" : "amber"}>
                          {depot ? "Dépôt terrain" : "Signalement citoyen"}
                        </Tag>
                      </td>
                      <td>{record.category}</td>
                      <td>
                        <span
                          className={`priority priority-${record.priority.toLowerCase()}`}
                        >
                          <i />
                          {record.priority}
                        </span>
                      </td>
                      <td>{statusLabel(record.status)}</td>
                      <td>
                        {depot ? (
                          <Tag tone="neutral">Inventaire</Tag>
                        ) : (
                          <select
                            className="status-select"
                            value={record.status}
                            onChange={event =>
                              onStatus(
                                record.id,
                                event.target.value as ReportStatus
                              )
                            }
                          >
                            <option>En attente</option>
                            <option>En cours de vérification</option>
                            <option>Validé</option>
                            <option>Rejeté</option>
                            <option>Doublon</option>
                            <option>Traité</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {selected ? (
          <div className="panel detail-panel">
            <div className="panel-header">
              <div>
                <Tag tone={isDepot ? "blue" : "amber"}>
                  {isDepot
                    ? "Donnée terrain · inventaire"
                    : "Signalement citoyen"}
                </Tag>
                <h3>{selected.id}</h3>
              </div>
              <button className="icon-button" onClick={() => setSelected(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="detail-location">
              <MapPinned size={16} />
              <span>
                {selected.location}
                <small>
                  {selected.arrondissement} · {selected.lat.toFixed(6)},{" "}
                  {selected.lng.toFixed(6)}
                </small>
              </span>
            </div>
            <div className="detail-grid">
              <div>
                <span>Catégorie</span>
                <strong>{selected.category}</strong>
              </div>
              <div>
                <span>Gravité</span>
                <strong>{selected.severity}</strong>
              </div>
              <div>
                <span>Priorité</span>
                <strong>{selected.priority}</strong>
              </div>
              <div>
                <span>Statut</span>
                <strong>{selected.status}</strong>
              </div>
            </div>
            <p className="detail-description">{selected.description}</p>
            {isDepot && (
              <div className="source-note">
                <strong>Provenance conservée</strong>
                <span>
                  Code source {selected.sourceCode} · attributs du GeoJSON non
                  réécrits · aucune récompense citoyenne.
                </span>
              </div>
            )}
            {!isDepot && (
              <div className="detail-actions">
                <button
                  className="button button-primary"
                  onClick={() => onStatus(selected.id, "Validé")}
                >
                  <CheckCircle2 size={15} /> Valider
                </button>
                <button
                  className="button button-outline"
                  onClick={() =>
                    toast.info("Intervention à créer", {
                      description: `Le signalement ${selected.id} est prêt à être associé à une intervention.`,
                    })
                  }
                >
                  <Plus size={15} /> Préparer intervention
                </button>
              </div>
            )}
            <div className="detail-history">
              <div className="eyebrow">Historique</div>
              <MiniTimeline history={selected.history} />
            </div>
          </div>
        ) : (
          <div className="panel select-hint">
            <MapPinned size={27} />
            <h3>Sélectionnez une entité</h3>
            <p>
              La fiche détaillée indique la provenance, les coordonnées,
              l’historique et les actions autorisées.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Interventions({
  interventions,
  sites,
  onCreated,
}: {
  interventions: Intervention[];
  sites: Array<Report | DepotSauvage>;
  onCreated: (intervention: Intervention) => void;
}) {
  const [filter, setFilter] = useState("Toutes");
  const [creating, setCreating] = useState(false);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [priority, setPriority] = useState<Intervention["priority"]>("Moyenne");
  const [plannedDate, setPlannedDate] = useState("");
  const [comment, setComment] = useState("");
  const list =
    filter === "Toutes"
      ? interventions
      : interventions.filter(item => item.status === filter);
  const save = () => {
    const site = sites.find(item => item.id === siteId);
    if (!site) {
      toast.error("Sélectionnez un site source");
      return;
    }
    const now = new Date().toISOString();
    onCreated({
      entityType: "intervention",
      id: uniqueId("INT"),
      siteId: site.id,
      site: site.location,
      arrondissement: site.arrondissement,
      priority,
      responsible: "À affecter",
      plannedDate: plannedDate || now.slice(0, 10),
      status: "À planifier",
      comment: comment.trim() || "Contrôle et qualification du site.",
      history: [{ label: "Intervention créée", date: now }],
    });
    setCreating(false);
    setComment("");
  };
  return (
    <div className="workspace mairie-workspace">
      <SectionHeading
        eyebrow="Opérations terrain"
        title="Interventions"
        description="Chaque intervention est liée à un site, possède un statut et conserve son historique."
        action={
          <button
            className="button button-primary"
            onClick={() => setCreating(current => !current)}
          >
            <Plus size={16} /> Nouvelle intervention
          </button>
        }
      />
      {creating && (
        <div className="panel form-panel intervention-form">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Nouvelle opération</div>
              <h3>Planifier une intervention</h3>
            </div>
            <button className="icon-button" onClick={() => setCreating(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="form-grid-2">
            <div className="field">
              <label>Site associé</label>
              <select
                value={siteId}
                onChange={event => setSiteId(event.target.value)}
              >
                <option value="">Choisir un dépôt ou signalement</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.id} · {site.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priorité</label>
              <select
                value={priority}
                onChange={event =>
                  setPriority(event.target.value as Intervention["priority"])
                }
              >
                <option>Basse</option>
                <option>Moyenne</option>
                <option>Haute</option>
              </select>
            </div>
            <div className="field">
              <label>Date prévue</label>
              <input
                type="date"
                value={plannedDate}
                onChange={event => setPlannedDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label>Responsable</label>
              <input value="À affecter" disabled />
            </div>
          </div>
          <div className="field">
            <label>Commentaires</label>
            <textarea
              value={comment}
              onChange={event => setComment(event.target.value)}
              rows={3}
              placeholder="Type de contrôle, moyens, consignes…"
            />
          </div>
          <div className="form-actions">
            <button
              className="button button-ghost"
              onClick={() => setCreating(false)}
            >
              Annuler
            </button>
            <button className="button button-primary" onClick={save}>
              <CheckCircle2 size={15} /> Enregistrer l’intervention
            </button>
          </div>
        </div>
      )}
      <div className="filter-chips">
        <span>Filtrer par statut</span>
        {[
          "Toutes",
          "À planifier",
          "Planifiée",
          "En cours",
          "Terminée",
          "À contrôler",
        ].map(item => (
          <button
            className={filter === item ? "chip-active" : ""}
            key={item}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="intervention-board">
        {list.map(item => (
          <div className="panel intervention-card" key={item.id}>
            <div className="intervention-card-top">
              <Tag
                tone={
                  item.priority === "Haute"
                    ? "red"
                    : item.priority === "Moyenne"
                      ? "amber"
                      : "green"
                }
              >
                {item.priority}
              </Tag>
              {statusLabel(item.status)}
              <button className="icon-button">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="eyebrow">
              {item.id} · {item.plannedDate}
            </div>
            <h3>{item.site}</h3>
            <p>{item.comment}</p>
            <div className="intervention-meta">
              <span>
                <Users size={14} />
                {item.responsible}
              </span>
              <span>
                <MapPinned size={14} />
                {item.arrondissement}
              </span>
            </div>
            <div className="intervention-footer">
              <span>
                Historique conservé · {item.history.length} événement(s)
              </span>
              <button
                className="text-button"
                onClick={() =>
                  toast.success("Fiche ouverte", {
                    description: `${item.id} · ${item.status}`,
                  })
                }
              >
                Voir la fiche <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {!list.length && (
          <div className="panel empty-state">
            <ClipboardCheck size={24} />
            <h3>Aucune intervention enregistrée</h3>
            <p>Créez une opération depuis un dépôt ou un signalement source.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MairieSimplePage({
  kind,
  state,
  onView,
}: {
  kind: "collectors" | "hubs" | "valorisation" | "routes" | "reports-mairie";
  state: DemoState;
  onView: (view: ViewKey) => void;
}) {
  const title =
    kind === "collectors"
      ? "Collecteurs indépendants"
      : kind === "hubs"
        ? "Points de regroupement"
        : kind === "valorisation"
          ? "Valorisation"
          : kind === "routes"
            ? "Tournées de collecte"
            : "Rapports municipaux";
  const description =
    kind === "collectors"
      ? "Les profils apparaîtront après import ou inscription validée."
      : kind === "hubs"
        ? "Les points apparaîtront après réception de données vérifiées."
        : kind === "valorisation"
          ? "Aucune quantité n’est affichée sans collecte validée et pesée traçable."
          : kind === "routes"
            ? "Les tournées restent indisponibles sans points, collecteurs et interventions validés."
            : "Les rapports seront disponibles après validation des données terrain.";
  const count =
    kind === "collectors"
      ? state.collectors.length
      : kind === "hubs"
        ? state.hubs.length
        : kind === "valorisation"
          ? state.collections.length
          : kind === "routes"
            ? state.interventions.length
            : state.reports.length;
  return (
    <div className="workspace mairie-workspace">
      <SectionHeading
        eyebrow="Données vérifiées uniquement"
        title={title}
        description={description}
        action={
          <Tag tone="blue">
            {count} élément{count > 1 ? "s" : ""}
          </Tag>
        }
      />
      <div className="panel empty-state">
        <div className="upload-icon">
          <MapPinned size={24} />
        </div>
        <h3>
          {count === 0
            ? "Aucune donnée disponible"
            : "Les données sont en cours de qualification"}
        </h3>
        <p>
          BOHICON CLEAN n’invente plus de collecteurs, points, quantités,
          tournées ou rapports. Ajoutez une source terrain ou utilisez le
          parcours concerné pour créer une donnée réelle.
        </p>
        {kind === "reports-mairie" && (
          <button
            className="button button-primary"
            onClick={() => onView("deposits")}
          >
            Voir les dépôts terrain <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function Analysis({ state }: { state: DemoState }) {
  const [criteria, setCriteria] = useState<CriterionDefinition[]>([
    {
      id: "density",
      label: "Densité des dépôts",
      weight: 1,
      direction: "maximize",
      active: true,
      indispensable: true,
    },
    {
      id: "coverage",
      label: "Couverture effective du service",
      weight: 0,
      direction: "maximize",
      active: false,
    },
    {
      id: "distance",
      label: "Distance aux points vérifiés",
      weight: 0,
      direction: "minimize",
      active: false,
    },
    {
      id: "sensitive",
      label: "Proximité des zones sensibles",
      weight: 0,
      direction: "maximize",
      active: false,
    },
  ]);
  const rows = state.administrativeAreas.map(area => ({
    id: area.key,
    values: [
      {
        id: "density",
        raw: state.depots.filter(
          depot => depot.arrondissementComputed === area.name
        ).length,
      },
      { id: "coverage", raw: null },
      { id: "distance", raw: null },
      { id: "sensitive", raw: null },
    ],
  }));
  const results = calculateMca(rows, criteria);
  const weightCheck = validateWeights(criteria);
  const updateWeight = (id: string, weight: number) =>
    setCriteria(current =>
      current.map(item => (item.id === id ? { ...item, weight } : item))
    );
  const toggle = (id: string) =>
    setCriteria(current =>
      current.map(item =>
        item.id === id ? { ...item, active: !item.active } : item
      )
    );
  return (
    <div className="workspace mairie-workspace">
      <SectionHeading
        eyebrow="Aide à la décision"
        title="Analyse multicritère"
        description="Chaque score combine des valeurs normalisées et des poids visibles. Les critères indisponibles restent manquants, jamais remplacés par zéro."
        action={
          <Tag tone={weightCheck.valid ? "green" : "red"}>
            Poids actifs · {(weightCheck.total * 100).toFixed(0)}%
          </Tag>
        }
      />
      <div className="analysis-layout">
        <div className="panel criteria-panel">
          <div className="panel-header">
            <div>
              <h3>Critères activables</h3>
              <span className="panel-subtitle">
                Le score final exige une somme de poids égale à 100 %.
              </span>
            </div>
            <SlidersHorizontal size={18} className="panel-accent" />
          </div>
          {criteria.map(criterion => (
            <div className="criterion" key={criterion.id}>
              <div className="criterion-head">
                <div>
                  <strong>{criterion.label}</strong>
                  <span>
                    {criterion.id === "density"
                      ? "Valeur calculée par polygone administratif"
                      : "Aucune couche opérationnelle reçue"}
                  </span>
                </div>
                <button
                  className={`toggle ${criterion.active ? "toggle-on" : ""}`}
                  onClick={() => toggle(criterion.id)}
                  aria-label={`Activer ${criterion.label}`}
                >
                  <i />
                </button>
              </div>
              <div className="criterion-controls">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(criterion.weight * 100)}
                  onChange={event =>
                    updateWeight(criterion.id, Number(event.target.value) / 100)
                  }
                  disabled={!criterion.active}
                />
                <b>{Math.round(criterion.weight * 100)}%</b>
              </div>
            </div>
          ))}
          <div
            className={`analysis-footnote ${weightCheck.valid ? "" : "analysis-error"}`}
          >
            <CircleAlert size={15} />
            {weightCheck.message} Les distances ne représentent pas une
            couverture réelle sans réseau, horaires et fréquence.
          </div>
        </div>
        <div className="panel score-panel">
          <div className="panel-header">
            <div>
              <h3>Priorité par arrondissement</h3>
              <span className="panel-subtitle">
                MCA relative, calculée sur la couche administrative validée
              </span>
            </div>
            <Tag tone="amber">
              {results.some(row => row.provisional) ? "Provisoire" : "Final"}
            </Tag>
          </div>
          {results.length ? (
            results.map(result => {
              const area = state.administrativeAreas.find(
                item => item.key === result.id
              );
              const score =
                result.score === null ? null : Math.round(result.score * 100);
              return (
                <div className="sector-row" key={result.id}>
                  <div
                    className={`sector-score score-${score !== null && score >= 66 ? "high" : score !== null && score >= 33 ? "medium" : "low"}`}
                  >
                    {score ?? "—"}
                  </div>
                  <div>
                    <strong>{area?.name ?? result.id}</strong>
                    <span>{result.justification}</span>
                    <small>
                      {Object.entries(result.values)
                        .map(
                          ([key, value]) =>
                            `${key}: ${value.raw ?? "—"} / ${value.normalized === null ? "—" : value.normalized.toFixed(2)}`
                        )
                        .join(" · ")}
                    </small>
                  </div>
                  <span
                    className={`priority priority-${result.className === "Élevée" ? "haute" : result.className === "Moyenne" ? "moyenne" : "basse"}`}
                  >
                    <i />
                    {result.className}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <Layers3 size={24} />
              <h3>Couche administrative indisponible</h3>
              <p>
                Importez ou rechargez les limites de Bohicon pour calculer un
                résultat sectoriel.
              </p>
            </div>
          )}
          <div className="analysis-footnote">
            <CircleAlert size={15} />
            Le score est une priorité relative selon les critères choisis ; il
            ne démontre pas une relation causale et ne remplace pas le jugement
            municipal.
          </div>
        </div>
      </div>
      <OperationalMap
        reports={state.depots}
        hubs={state.hubs}
        interventions={state.interventions}
        importedLayers={state.importedLayers}
      />
    </div>
  );
}

function Intelligence({ state }: { state: DemoState }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(
    `Résumé des sources : ${state.depots.length} dépôt${state.depots.length > 1 ? "s" : ""} terrain recensé${state.depots.length > 1 ? "s" : ""} et ${state.reports.length} signalement${state.reports.length > 1 ? "s" : ""}. Les recommandations resteront limitées aux attributs réellement disponibles.`
  );
  const ask = () => {
    if (!question.trim()) return;
    setAnswer(
      `Lecture déterministe de « ${question} » : ${state.depots.length} dépôt${state.depots.length > 1 ? "s" : ""} terrain et ${state.reports.length} signalement${state.reports.length > 1 ? "s" : ""} sont disponibles. Aucune IA externe ni donnée inventée n’est utilisée ; cette réponse doit être vérifiée par le responsable.`
    );
    setQuestion("");
  };
  const priorityReports = state.depots
    .filter(report => report.priority === "Haute")
    .slice(0, 3);
  return (
    <div className="workspace mairie-workspace">
      <SectionHeading
        eyebrow="Assistance à la décision"
        title="Intelligence & recommandations"
        description="Les recommandations restent adossées aux données terrain et n’inventent aucun site ou flux."
        action={<Tag tone="purple">IA non connectée</Tag>}
      />
      <div className="ai-layout">
        <div className="panel ai-chat-panel">
          <div className="ai-chat-head">
            <div className="ai-orb">
              <Sparkles size={19} />
            </div>
            <div>
              <strong>Assistant Bohicon Clean</strong>
              <span>Règles locales · aucune donnée fictive</span>
            </div>
          </div>
          <div className="ai-answer">
            <div className="eyebrow">Situation source</div>
            <p>{answer}</p>
          </div>
          <div className="ai-input">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ask()}
              placeholder="Interroger les données terrain…"
            />
            <button className="button button-primary" onClick={ask}>
              <Send size={15} />
            </button>
          </div>
        </div>
        <div className="recommendation-stack">
          {priorityReports.length ? (
            priorityReports.map(report => (
              <div className="panel recommendation-card" key={report.id}>
                <div className="recommendation-head">
                  <div className="recommendation-icon recommendation-red">
                    <Target size={16} />
                  </div>
                  <Tag tone="red">Priorité source</Tag>
                </div>
                <h3>{report.location}</h3>
                <p>
                  {report.description ||
                    "Aucune description complémentaire dans la source."}
                </p>
                <span className="recommendation-source">
                  Source : {report.id} · attributs terrain
                </span>
              </div>
            ))
          ) : (
            <div className="panel empty-state">
              <Target size={24} />
              <h3>Aucune recommandation calculable</h3>
              <p>Aucun dépôt terrain de priorité haute n’est disponible.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeoJSONImport({
  state,
  onImported,
}: {
  state: DemoState;
  onImported: (layer: ImportedLayer) => void;
}) {
  const [inspection, setInspection] = useState<GeoInspection | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const displayGeoJSON = normalizeGeoJSONForDisplay(parsed);
        setInspection(inspectGeoJSON(displayGeoJSON));
        (window as any).__bohiconGeoJSON = displayGeoJSON;
      } catch {
        setInspection(null);
        setParseError(
          "JSON illisible : le fichier original n’a pas été modifié."
        );
      }
    };
    reader.readAsText(file);
  };
  const save = () => {
    if (!inspection || !inspection.valid) return;
    const parsed = (window as any).__bohiconGeoJSON;
    const { warnings } = inspectionSummary(inspection);
    const layer: ImportedLayer = {
      id: `GEO-${Date.now()}`,
      name: fileName.toLowerCase().includes("arr")
        ? "Limites des arrondissements"
        : fileName.toLowerCase().includes("depot")
          ? "Dépôts sauvages · terrain"
          : "Couche terrain importée",
      fileName,
      geometryTypes: inspection.geometryTypes,
      featureCount: inspection.featureCount,
      validCount: inspection.validCount,
      warningCount: warnings,
      properties: inspection.propertyKeys,
      provenance: "terrain",
      importedAt: new Date().toLocaleString("fr-FR"),
      sourceCrs: parsed?.sourceCrs,
      displayCrs: parsed?.displayCrs,
      geojson: parsed,
    };
    onImported(layer);
    setInspection(null);
    setFileName("");
    toast.success("Couche importée", {
      description: `${layer.validCount} entités conservées avec leur provenance terrain.`,
    });
  };
  return (
    <div className="panel import-panel">
      <div className="import-drop">
        <div className="upload-icon">
          <FileJson size={23} />
        </div>
        <h3>Importer un GeoJSON</h3>
        <p>
          Limites d’arrondissements ou dépôts sauvages recensés sur le terrain.
        </p>
        <label className="button button-primary">
          <Upload size={16} /> Choisir un fichier
          <input
            type="file"
            accept=".geojson,.json,application/geo+json,application/json"
            onChange={handleFile}
            hidden
          />
        </label>
        <small>Le fichier original est lu localement et jamais modifié.</small>
      </div>
      {parseError && (
        <div className="inline-error">
          <CircleAlert size={15} />
          {parseError}
        </div>
      )}
      {inspection && (
        <div className="inspection-result">
          <div className="inspection-head">
            <div>
              <div className="eyebrow">Aperçu · {fileName}</div>
              <h3>
                {inspection.valid
                  ? "Structure exploitable"
                  : "Anomalies à corriger"}
              </h3>
            </div>
            {inspection.valid ? (
              <Tag tone="green">Valide</Tag>
            ) : (
              <Tag tone="red">Non importable</Tag>
            )}
          </div>
          <div className="inspection-stats">
            <div>
              <strong>{inspection.validCount}</strong>
              <span>entités valides</span>
            </div>
            <div>
              <strong>{inspection.featureCount}</strong>
              <span>entités lues</span>
            </div>
            <div>
              <strong>{inspection.geometryTypes.join(", ") || "—"}</strong>
              <span>géométries</span>
            </div>
            <div>
              <strong>{inspection.propertyKeys.length}</strong>
              <span>champs source</span>
            </div>
          </div>
          {inspection.propertyKeys.length > 0 && (
            <div className="property-list">
              <span>Attributs conservés</span>
              {inspection.propertyKeys.slice(0, 8).map(key => (
                <Tag key={key}>{key}</Tag>
              ))}
            </div>
          )}
          <div className="issue-list">
            {inspection.issues.slice(0, 5).map((issue, index) => (
              <div className={`issue-${issue.kind}`} key={index}>
                {issue.kind === "error" ? (
                  <CircleAlert size={14} />
                ) : (
                  <CircleDot size={14} />
                )}
                {issue.message}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button
              className="button button-outline"
              onClick={() => setInspection(null)}
            >
              Annuler
            </button>
            <button
              className="button button-primary"
              disabled={!inspection.valid}
              onClick={save}
            >
              <CloudUpload size={15} /> Conserver la couche
            </button>
          </div>
        </div>
      )}
      {state.importedLayers.length > 0 && (
        <div className="imported-list">
          <div className="eyebrow">Couches importées</div>
          {state.importedLayers.map(layer => (
            <div className="imported-row" key={layer.id}>
              <div className="imported-icon">
                <FileJson size={16} />
              </div>
              <div>
                <strong>{layer.name}</strong>
                <span>
                  {layer.fileName} · {layer.validCount} entités ·{" "}
                  {layer.importedAt}
                  {layer.sourceCrs
                    ? ` · ${layer.sourceCrs} → ${layer.displayCrs}`
                    : ""}
                </span>
              </div>
              <Tag tone="blue">Terrain</Tag>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Admin({
  state,
  onImported,
  onReset,
}: {
  state: DemoState;
  onImported: (layer: ImportedLayer) => void;
  onReset: () => void;
}) {
  return (
    <div className="workspace">
      <SectionHeading
        eyebrow="Administration"
        title="Données, rôles & configuration"
        description="Préparer les fichiers terrain, auditer la provenance et remettre la démonstration à zéro."
      />
      <div className="admin-grid">
        <GeoJSONImport state={state} onImported={onImported} />
        <div className="panel admin-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Comptes disponibles</div>
              <h3>Rôles locaux</h3>
            </div>
            <Users size={19} className="panel-accent" />
          </div>
          {[
            ["C", "Citoyen", "Créer et suivre ses propres signalements"],
            [
              "K",
              "Collecteur",
              "Soumettre une candidature et déclarer une collecte autorisée",
            ],
            ["M", "Agent municipal", "Vérifier, intervenir et analyser"],
            ["A", "Administrateur", "Gérer les rôles, imports et paramètres"],
          ].map(([initials, role, access]) => (
            <div className="account-row" key={role}>
              <div className="profile-avatar">{initials}</div>
              <div>
                <strong>{role}</strong>
                <span>{access}</span>
              </div>
              <Tag tone={role === "Agent municipal" ? "green" : "neutral"}>
                Rôle
              </Tag>
            </div>
          ))}
        </div>
        <div className="panel admin-panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">État de la plateforme</div>
              <h3>Fonctions configurées</h3>
            </div>
            <Settings2 size={19} className="panel-accent" />
          </div>
          <div className="feature-status">
            <div>
              <CheckCircle2 size={15} />
              <span>Persistance locale</span>
              <Tag tone="green">Active</Tag>
            </div>
            <div>
              <CheckCircle2 size={15} />
              <span>Historique métier</span>
              <Tag tone="green">Active</Tag>
            </div>
            <div>
              <CircleAlert size={15} />
              <span>GPS réel / caméra</span>
              <Tag tone="amber">À connecter</Tag>
            </div>
            <div>
              <CircleAlert size={15} />
              <span>IA externe</span>
              <Tag tone="amber">Non configurée</Tag>
            </div>
            <div>
              <CircleAlert size={15} />
              <span>Backend PostGIS</span>
              <Tag tone="amber">Préparé</Tag>
            </div>
          </div>
          <button
            className="button button-outline reset-button"
            onClick={onReset}
          >
            <RefreshCcw size={15} /> Réinitialiser les données locales
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role>("public");
  const [view, setView] = useState<ViewKey>("overview");
  const [state, setState] = useState<DemoState>(() => loadState());
  const session = trpc.auth.me.useQuery();
  const createSignalementRemote = trpc.signalements.create.useMutation();
  const updateSignalementRemote = trpc.signalements.updateStatus.useMutation();
  const createInterventionRemote = trpc.interventions.create.useMutation();
  useEffect(() => {
    persistState(state);
  }, [state]);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/depots_sauvages_public.geojson")
      .then(response => response.json())
      .then(input => {
        if (cancelled) return;
        const inspection = inspectGeoJSON(input);
        if (!inspection.valid) return;
        setState(current => {
          if (
            current.importedLayers.some(
              layer => layer.fileName === "depots_sauvages_public.geojson"
            )
          )
            return current;
          const terrainDepots = terrainDepositsFromGeoJSON(input);
          const existingIds = new Set(current.depots.map(depot => depot.id));
          const { warnings } = inspectionSummary(inspection);
          const layer: ImportedLayer = {
            id: "GEO-DEPOTS-2026",
            name: "Dépôts sauvages · terrain utilisateur",
            fileName: "depots_sauvages_public.geojson",
            geometryTypes: inspection.geometryTypes,
            featureCount: inspection.featureCount,
            validCount: inspection.validCount,
            warningCount: warnings,
            properties: inspection.propertyKeys,
            provenance: "terrain",
            importedAt: "10 oct. 2026 · fichier fourni par l’utilisateur",
            geojson: input,
          };
          const boundaryLayer = current.importedLayers.find(item =>
            item.fileName.toLowerCase().includes("arrondissement")
          );
          const enrichedDepots = terrainDepots
            .filter(depot => !existingIds.has(depot.id))
            .map(depot => {
              const match = boundaryLayer
                ? linkPointToAdministrativeArea(
                    [depot.lng, depot.lat],
                    boundaryLayer.geojson
                  )
                : null;
              return { ...depot, arrondissementComputed: match?.name };
            });
          return {
            ...current,
            depots: [...current.depots, ...enrichedDepots],
            importedLayers: [...current.importedLayers, layer],
          };
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/Arrondissements_Bohicon_wgs84.geojson")
      .then(response => response.json())
      .then(input => {
        if (cancelled) return;
        const inspection = inspectGeoJSON(input);
        if (!inspection.valid) return;
        setState(current => {
          if (
            current.importedLayers.some(
              layer => layer.fileName === "Arrondissements_Bohicon.geojson"
            )
          )
            return current;
          const { warnings } = inspectionSummary(inspection);
          const layer: ImportedLayer = {
            id: "GEO-ARRONDISSEMENTS-2026",
            name: "Limites administratives · arrondissements de Bohicon",
            fileName: "Arrondissements_Bohicon.geojson",
            geometryTypes: inspection.geometryTypes,
            featureCount: inspection.featureCount,
            validCount: inspection.validCount,
            warningCount: warnings,
            properties: inspection.propertyKeys,
            provenance: "terrain",
            importedAt:
              "10 oct. 2026 · fichier fourni, reprojeté pour affichage",
            sourceCrs: String(input.sourceCrs ?? "EPSG:32631"),
            displayCrs: String(input.displayCrs ?? "EPSG:4326"),
            geojson: input,
          };
          const administrativeAreas = administrativeAreasFromGeoJSON(input);
          const depots = current.depots.map(depot => ({
            ...depot,
            arrondissementComputed: linkPointToAdministrativeArea(
              [depot.lng, depot.lat],
              input
            )?.name,
          }));
          return {
            ...current,
            depots,
            administrativeAreas,
            importedLayers: [...current.importedLayers, layer],
          };
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const switchRole = (nextRole: Role, nextView: ViewKey = "overview") => {
    setRole(nextRole);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => {
    if (
      !window.confirm(
        "Réinitialiser les saisies locales et recharger les données terrain ?"
      )
    )
      return;
    localStorage.removeItem("bohicon-clean-terrain-only-v2");
    window.location.reload();
  };
  const submitReport = (report: Report) => {
    setState(current => ({
      ...current,
      reports: [report, ...current.reports],
    }));
    if (session.data) {
      void createSignalementRemote
        .mutateAsync({
          category: report.category,
          severity: report.severity,
          priority: report.priority,
          description: report.description,
          location: report.location,
          lat: report.lat,
          lng: report.lng,
          arrondissementSource:
            report.arrondissementSource ?? report.arrondissement,
          arrondissementComputed: report.arrondissementComputed,
          attachments: report.attachments.map(file => ({
            id: file.id,
            originalName: file.name,
            mimeType: file.mimeType,
            sizeBytes: file.size,
            status: file.status,
          })),
        })
        .catch(() =>
          toast.warning("Signalement conservé localement", {
            description:
              "La session serveur n’a pas accepté la pièce ; l’enregistrement local reste traçable.",
          })
        );
    }
    toast.success("Signalement enregistré", {
      description: `${report.id} · statut En attente. Aucun point n’est crédité avant validation.`,
    });
    setView("reports");
  };
  const updateReport = (id: string, status: ReportStatus) => {
    const currentReport = state.reports.find(report => report.id === id);
    if (!currentReport) return;
    if (
      currentReport.status !== status &&
      !SIGNALMENT_STATUS_TRANSITIONS[currentReport.status]?.includes(status)
    ) {
      toast.error("Transition de statut interdite", {
        description: `${currentReport.status} → ${status} n’est pas autorisé.`,
      });
      return;
    }
    setState(current => {
      const reports = current.reports.map(report => {
        if (report.id !== id) return report;
        const duplicate = report.status === status;
        const now = new Date().toISOString();
        const nextHistory = duplicate
          ? report.history
          : [
              ...report.history,
              {
                label: `Statut mis à jour · ${status}`,
                date: now,
                note:
                  status === "Validé"
                    ? "Décision municipale enregistrée"
                    : undefined,
                actorId: "municipal-local",
              },
            ];
        return {
          ...report,
          status,
          history: nextHistory,
          rewardCredited:
            report.rewardCredited || status !== "Validé"
              ? report.rewardCredited
              : true,
        };
      });
      const target = current.reports.find(report => report.id === id);
      const shouldCredit =
        target && status === "Validé" && !target.rewardCredited;
      return {
        ...current,
        reports,
        points: shouldCredit
          ? current.points + DEFAULT_SIGNALMENT_REWARD_POINTS
          : current.points,
        ledger: shouldCredit
          ? [
              {
                id: uniqueId("LED"),
                date: new Date().toISOString(),
                label: `Signalement ${id} validé`,
                amount: DEFAULT_SIGNALMENT_REWARD_POINTS,
                kind: "credit",
                sourceId: id,
              },
              ...current.ledger,
            ]
          : current.ledger,
      };
    });
    if (session.data && status !== "En attente")
      void updateSignalementRemote
        .mutateAsync({ id, status, note: "Mise à jour depuis l’espace mairie" })
        .catch(() =>
          toast.warning("Statut local uniquement", {
            description:
              "La mutation serveur a échoué ; l’historique local reste visible.",
          })
        );
    toast.success(`Statut mis à jour · ${status}`, {
      description:
        status === "Validé"
          ? "Le crédit de points unique est appliqué si nécessaire."
          : "L’historique du signalement est conservé.",
    });
  };
  const saveCollection = (collection: Collection) => {
    setState(current => ({
      ...current,
      collections: [collection, ...current.collections],
    }));
    toast.success("Collecte déclarée", {
      description:
        "La pesée vérifiée reste nécessaire avant validation et paiement.",
    });
    setView("history");
  };
  const saveIntervention = (intervention: Intervention) => {
    setState(current => ({
      ...current,
      interventions: [intervention, ...current.interventions],
    }));
    if (session.data)
      void createInterventionRemote
        .mutateAsync({
          id: intervention.id,
          siteId: intervention.siteId,
          siteType: intervention.siteId.startsWith("SIG")
            ? "signalement"
            : "depot",
          type: "Contrôle / nettoyage",
          priority: intervention.priority,
          plannedDate: intervention.plannedDate
            ? new Date(intervention.plannedDate).toISOString()
            : undefined,
          comment: intervention.comment,
        })
        .catch(() =>
          toast.warning("Intervention locale uniquement", {
            description:
              "La création serveur n’a pas été acceptée ; la fiche locale reste conservée.",
          })
        );
    toast.success("Intervention créée", {
      description: `${intervention.id} · statut À planifier.`,
    });
  };
  const saveLayer = (layer: ImportedLayer) =>
    setState(current => {
      const terrainDepots = layer.fileName.toLowerCase().includes("depot")
        ? terrainDepositsFromGeoJSON(layer.geojson)
        : [];
      const existingIds = new Set(current.depots.map(depot => depot.id));
      return {
        ...current,
        depots: [
          ...current.depots,
          ...terrainDepots.filter(depot => !existingIds.has(depot.id)),
        ],
        importedLayers: [...current.importedLayers, layer],
      };
    });
  if (role === "public")
    return <PublicHome onRole={switchRole} state={state} />;
  const renderView = () => {
    if (role === "citizen") {
      if (view === "report")
        return (
          <ReportForm
            administrativeAreas={state.administrativeAreas}
            onSubmit={submitReport}
            onCancel={() => setView("overview")}
          />
        );
      if (view === "reports")
        return <CitizenReports reports={state.reports} onView={setView} />;
      if (view === "points")
        return <PointsWallet state={state} onView={setView} />;
      if (view === "rewards") return <Rewards />;
      if (view === "map")
        return (
          <div className="workspace">
            <SectionHeading
              eyebrow="Proximité"
              title="Carte citoyenne"
              description="Dépôts, points et signalements proches dans la vue de démonstration."
            />
            <OperationalMap
              reports={[...state.depots, ...state.reports]}
              hubs={state.hubs}
              interventions={state.interventions}
              importedLayers={state.importedLayers}
            />
          </div>
        );
      return (
        <CitizenOverview
          state={state}
          onView={setView}
          onReport={() => setView("report")}
        />
      );
    }
    if (role === "collector") {
      if (view === "training") return <Training />;
      if (view === "collection")
        return <NewCollection state={state} onSaved={saveCollection} />;
      if (view === "history")
        return <CollectorHistory collections={state.collections} />;
      if (view === "map")
        return (
          <div className="workspace">
            <SectionHeading
              eyebrow="Points de regroupement"
              title="Où déposer aujourd’hui ?"
              description="Capacités et localisation issues des points vérifiés ; aucune distance routière n’est inventée."
            />
            <OperationalMap
              reports={[...state.depots, ...state.reports]}
              hubs={state.hubs}
              interventions={state.interventions}
              importedLayers={state.importedLayers}
            />
          </div>
        );
      return <CollectorOverview state={state} onView={setView} />;
    }
    if (role === "mairie") {
      if (view === "map")
        return (
          <div className="workspace mairie-workspace">
            <SectionHeading
              eyebrow="SIG opérationnel"
              title="Carte de Bohicon"
              description="Couches terrain affichées sans fond cartographique."
            />
            <OperationalMap
              reports={[...state.depots, ...state.reports]}
              hubs={state.hubs}
              interventions={state.interventions}
              importedLayers={state.importedLayers}
              onSelect={() => setView("deposits")}
            />
          </div>
        );
      if (view === "deposits")
        return <Deposits state={state} onStatus={updateReport} />;
      if (view === "interventions")
        return (
          <Interventions
            interventions={state.interventions}
            sites={[...state.depots, ...state.reports]}
            onCreated={saveIntervention}
          />
        );
      if (
        [
          "collectors",
          "hubs",
          "valorisation",
          "routes",
          "reports-mairie",
        ].includes(view)
      )
        return (
          <MairieSimplePage kind={view as any} state={state} onView={setView} />
        );
      if (view === "analysis") return <Analysis state={state} />;
      if (view === "intelligence") return <Intelligence state={state} />;
      return (
        <MairieOverview
          state={state}
          onView={setView}
          onStatus={updateReport}
        />
      );
    }
    return <Admin state={state} onImported={saveLayer} onReset={reset} />;
  };
  return (
    <AppShell
      role={role}
      view={view}
      setRole={switchRole}
      setView={setView}
      onReset={reset}
    >
      {renderView()}
    </AppShell>
  );
}
