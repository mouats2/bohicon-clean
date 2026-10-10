import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Toaster, toast } from "sonner";
import {
  ARRONDISSEMENTS,
  CATEGORIES,
  type Collection,
  type DemoState,
  type ImportedLayer,
  type Intervention,
  type Report,
  type ReportStatus,
  createInitialState,
  formatFcfa,
  loadState,
  persistState,
  terrainReportsFromGeoJSON,
} from "@/lib/demo";
import { inspectionSummary, inspectGeoJSON, normalizeGeoJSONForDisplay, type GeoInspection } from "@/lib/geojson";

 type Role = "public" | "citizen" | "collector" | "mairie" | "admin";
 type ViewKey = "overview" | "report" | "reports" | "points" | "rewards" | "map" | "training" | "collection" | "history" | "deposits" | "interventions" | "collectors" | "hubs" | "valorisation" | "analysis" | "intelligence" | "routes" | "reports-mairie" | "users" | "settings" | "imports";

const roleLabels: Record<Role, string> = {
  public: "Accueil public",
  citizen: "Espace citoyen",
  collector: "Espace collecteur",
  mairie: "Pilotage mairie",
  admin: "Administration",
};

const navByRole: Record<Exclude<Role, "public">, { key: ViewKey; label: string; icon: typeof Gauge }[]> = {
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
    { key: "intelligence", label: "Intelligence & recommandations", icon: Sparkles },
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
  "Validé": "green",
  "Traité": "green",
  "En attente": "amber",
  "En cours de vérification": "blue",
  "Rejeté": "red",
  "Doublon": "purple",
  "À planifier": "amber",
  "Planifiée": "blue",
  "En cours": "blue",
  "Terminée": "green",
  "À contrôler": "amber",
  "Actif": "green",
  "En formation": "amber",
  "Suspendu": "red",
};

const statusLabel = (value: string) => <span className={`status status-${statusTone[value] ?? "neutral"}`}><span className="status-dot" />{value}</span>;

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "brand-compact" : ""}`}>
    <div className="brand-mark" aria-hidden="true"><Leaf size={18} strokeWidth={2.6} /><CircleDot size={8} className="brand-mark-dot" /></div>
    <div><div className="brand-name">BOHICON <span>CLEAN</span></div>{!compact && <div className="brand-caption">Ville propre · action mesurable</div>}</div>
  </div>;
}

function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "blue" | "purple" | "red" }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

function Kpi({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string; detail: string; icon: typeof Gauge; tone?: string }) {
  return <div className="kpi-card"><div className={`kpi-icon kpi-${tone}`}><Icon size={18} /></div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-detail">{detail}</div></div>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

function DemoNotice({ children = "Données terrain importées · source conservée" }: { children?: ReactNode }) {
  return <div className="demo-notice"><Sparkles size={14} /><span>{children}</span></div>;
}

function MiniTimeline({ history }: { history: { label: string; date: string; note?: string }[] }) {
  return <div className="timeline">{history.map((event, index) => <div className="timeline-item" key={`${event.label}-${index}`}><span className={`timeline-dot ${index === history.length - 1 ? "timeline-dot-active" : ""}`} /><div><strong>{event.label}</strong><span>{event.date}</span>{event.note && <small>{event.note}</small>}</div></div>)}</div>;
}

function OperationalMap({ reports, hubs: _hubs, interventions: _interventions, importedLayers, compact = false, onSelect }: { reports: Report[]; hubs: DemoState["hubs"]; interventions: Intervention[]; importedLayers: ImportedLayer[]; compact?: boolean; onSelect?: (report: Report) => void }) {
  const mapNode = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapNode.current) return;
    const map = L.map(mapNode.current, { zoomControl: true, attributionControl: true }).setView([7.18, 2.06], compact ? 13 : 12);
    map.attributionControl.addAttribution("© OpenStreetMap France · contributeurs OpenStreetMap");
    L.imageOverlay("/data/osm/bohicon-z13-mosaic.jpg", [[7.057282352971572, 1.93359375], [7.318881730366753, 2.197265625]], { opacity: 1, interactive: false }).addTo(map);
    const bounds = L.latLngBounds([]);
    importedLayers.filter(layer => !layer.fileName.toLowerCase().includes("depot")).forEach(layer => {
      const geoLayer = L.geoJSON(layer.geojson as any, { style: { color: "#0e4f3c", weight: 2, fillColor: "#8bbd78", fillOpacity: 0.12 } }).addTo(map);
      bounds.extend(geoLayer.getBounds());
    });
    const visibleReports = compact ? reports.slice(0, 4) : reports;
    visibleReports.forEach(report => {
      const color = report.provenance === "terrain" ? "#3e7898" : "#c65d51";
      const marker = L.circleMarker([report.lat, report.lng], { radius: compact ? 5 : 6, color, fillColor: color, fillOpacity: 0.86, weight: 2 });
      marker.bindPopup(`<strong>${report.id}</strong><br>${report.location}<br><small>${report.provenance === "terrain" ? "Donnée terrain" : "Donnée supprimée"}</small>`);
      marker.on("click", () => onSelect?.(report)); marker.addTo(map); bounds.extend([report.lat, report.lng]);
    });
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.12), { maxZoom: compact ? 14 : 15 });
    setTimeout(() => map.invalidateSize(), 80);
    return () => { map.remove(); };
  }, [reports, importedLayers, compact, onSelect]);
  return <div className={`map-card ${compact ? "map-compact" : ""}`}><div className="map-toolbar"><div className="map-title"><Map size={16} /> OpenStreetMap <Tag tone="green">Terrain uniquement</Tag></div><div className="map-tools"><span className="map-source-label">© OSM</span></div></div><div className="map-canvas"><div ref={mapNode} className="osm-map" role="img" aria-label="Carte OpenStreetMap de Bohicon" /><div className="map-legend"><span><i className="legend-dot legend-blue" />Dépôts terrain</span><span><i className="legend-imported" />Limites reçues</span></div></div></div>;
}

function PublicHome({ onRole }: { onRole: (role: Role, view?: ViewKey) => void }) {
  const steps = [
    ["01", "Signaler", "Un citoyen documente un dépôt et le localise."],
    ["02", "Vérifier", "La mairie qualifie, priorise et affecte une intervention."],
    ["03", "Collecter", "Un collecteur transporte les matières vers un point identifié."],
    ["04", "Valoriser", "Les flux triés deviennent des données et des ressources."],
  ];
  return <div className="public-page">
    <header className="public-header"><Brand /><nav><a href="#fonctionnement">Fonctionnement</a><a href="#parcours">Parcours</a><a href="#apropos">À propos</a></nav><div className="public-actions"><button className="button button-ghost" onClick={() => onRole("citizen", "report")}>Signaler un dépôt <ArrowUpRight size={15} /></button><button className="button button-dark" onClick={() => onRole("mairie")}>Espace mairie <ChevronRight size={15} /></button></div></header>
    <main>
      <section className="hero-section"><div className="hero-copy"><DemoNotice>Aucune statistique fictive · données terrain prioritaires</DemoNotice><h1>Une ville propre commence par une <em>action visible.</em></h1><p className="hero-lead">BOHICON CLEAN relie les habitants, les collecteurs et la mairie pour transformer chaque signalement en décision, puis en résultat mesurable.</p><div className="hero-actions"><button className="button button-primary button-large" onClick={() => onRole("citizen", "report")}>Signaler un dépôt <Send size={16} /></button><button className="button button-outline button-large" onClick={() => onRole("collector", "training")}>Devenir collecteur <ChevronRight size={16} /></button></div><div className="hero-proof"><div><strong>Couche terrain disponible</strong><small>188 dépôts · 10 limites administratives</small></div></div></div><div className="hero-visual"><div className="hero-map-label"><span className="pulse-dot" /> Bohicon · fond OpenStreetMap</div><OperationalMap reports={[]} hubs={[]} interventions={[]} importedLayers={[]} compact /></div></section>
      <section className="stat-strip"><div><strong>188</strong><span>dépôts terrain reçus</span></div><div><strong>10</strong><span>limites administratives</span></div><div><strong>0</strong><span>collecte fictive conservée</span></div><div><strong>0</strong><span>indicateur inventé</span></div></section>
      <section className="editorial-section" id="fonctionnement"><SectionHeading eyebrow="Le cycle BOHICON CLEAN" title="Du terrain à la décision." description="Les données reçues sont affichées avec leur provenance ; aucune valeur opérationnelle n’est inventée en l’absence de source." /><div className="step-grid">{steps.map(([number, title, body]) => <div className="step-card" key={number}><span>{number}</span><div className="step-icon"><Leaf size={18} /></div><h3>{title}</h3><p>{body}</p><ChevronRight size={16} className="step-arrow" /></div>)}</div></section>
      <section className="split-section"><div><div className="eyebrow">Une lecture commune du territoire</div><h2>Les données ne restent pas dans un tableau.</h2><p>Les dépôts et limites reçus sont visibles sur OpenStreetMap, avec leur provenance. Les flux de collecte apparaîtront uniquement après réception de données opérationnelles.</p><button className="text-button" onClick={() => onRole("mairie", "overview")}>Explorer le pilotage municipal <ArrowUpRight size={15} /></button></div><div className="category-panel"><div className="panel-title"><span>Catégories source</span><Tag tone="green">En attente d’analyse</Tag></div>{CATEGORIES.map((category, index) => <div className="category-row" key={category}><div className={`category-icon cat-${index}`}><Recycle size={15} /></div><span>{category}</span><div className="category-bar"><i style={{ width: "0%" }} /></div><strong>—</strong></div>)}</div></section>
      <section className="journey-section" id="parcours"><SectionHeading eyebrow="Trois parcours, une même mission" title="Chacun voit ce qui lui permet d’agir." /><div className="journey-grid"><button className="journey-card journey-citizen" onClick={() => onRole("citizen")}><div className="journey-top"><span>01 · Citoyen</span><MapPinned size={19} /></div><h3>Je signale, je suis, je contribue.</h3><p>Un parcours mobile-first pour documenter un dépôt, suivre sa résolution et gagner des points d’engagement.</p><span className="journey-link">Ouvrir l’espace citoyen <ChevronRight size={15} /></span></button><button className="journey-card journey-collector" onClick={() => onRole("collector")}><div className="journey-top"><span>02 · Collecteur</span><Recycle size={19} /></div><h3>Je collecte, je pèse, je valorise.</h3><p>Formation, sécurité, points de regroupement, pesées vérifiées et gains transparents.</p><span className="journey-link">Ouvrir l’espace collecteur <ChevronRight size={15} /></span></button><button className="journey-card journey-mairie" onClick={() => onRole("mairie")}><div className="journey-top"><span>03 · Mairie</span><BarChart3 size={19} /></div><h3>Je vois, je priorise, je décide.</h3><p>Une vue opérationnelle pour relier les signalements, les interventions, la collecte et l’analyse spatiale.</p><span className="journey-link">Ouvrir le pilotage mairie <ChevronRight size={15} /></span></button></div></section>
      <section className="about-section" id="apropos"><div className="about-mark"><Leaf size={42} /><span>BC</span></div><div><div className="eyebrow">À propos du projet</div><h2>Un prototype de génie urbain, ancré dans le réel.</h2><p>BOHICON CLEAN est conçu comme une démonstration scientifique et fonctionnelle : les données de terrain à venir resteront prioritaires, traçables et distinctes des hypothèses de simulation.</p><div className="about-pills"><Tag tone="green">Local-first</Tag><Tag tone="blue">Cartographie</Tag><Tag tone="amber">Décision assistée</Tag><Tag>PostGIS-ready</Tag></div></div></section>
    </main>
    <footer className="public-footer"><Brand compact /><div><span>Contact projet</span><span>Confidentialité</span><span>Conditions d’utilisation</span></div><small>© 2026 BOHICON CLEAN · Démonstration académique</small></footer>
  </div>;
}

function AppShell({ role, view, setRole, setView, children, onReset }: { role: Exclude<Role, "public">; view: ViewKey; setRole: (role: Role) => void; setView: (view: ViewKey) => void; children: ReactNode; onReset: () => void }) {
  const [mobileNav, setMobileNav] = useState(false);
  const items = navByRole[role];
  return <div className="app-shell"><aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}><div className="sidebar-head"><Brand compact /><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div><div className="sidebar-role"><span className="role-kicker">Compte local</span><strong>{roleLabels[role]}</strong><span className="role-user">Aïcha A. · Connectée</span></div><nav className="side-nav">{items.map(item => { const Icon = item.icon; return <button key={item.key} className={`side-link ${view === item.key ? "side-link-active" : ""}`} onClick={() => { setView(item.key); setMobileNav(false); }}><Icon size={17} /><span>{item.label}</span>{item.key === "deposits" && <span className="nav-count">12</span>}</button>; })}</nav><div className="sidebar-bottom"><button className="side-link" onClick={() => { setRole("public"); setMobileNav(false); }}><ArrowDownToLine size={17} /><span>Retour à l’accueil</span></button><button className="side-link muted-link" onClick={onReset}><RefreshCcw size={16} /><span>Réinitialiser les données locales</span></button></div></aside><div className="main-column"><header className="app-topbar"><button className="icon-button menu-button" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="topbar-context"><span className="topbar-kicker">Bohicon · Bénin</span><strong>{view === "overview" ? "Vue d’ensemble" : navByRole[role].find(item => item.key === view)?.label ?? "Espace de travail"}</strong></div><div className="topbar-actions"><div className="role-switch"><span>Voir comme</span><select value={role} onChange={event => setRole(event.target.value as Role)}><option value="citizen">Citoyen</option><option value="collector">Collecteur</option><option value="mairie">Mairie</option><option value="admin">Administration</option></select><ChevronDown size={13} /></div><button className="icon-button notification-button"><Bell size={17} /><i /></button><div className="topbar-avatar">AA</div></div></header><main className="app-content">{children}</main></div><Toaster position="bottom-right" richColors /></div>;
}

function CitizenOverview({ state, onView, onReport }: { state: DemoState; onView: (view: ViewKey) => void; onReport: () => void }) {
  const active = state.reports.filter(report => !["Traité", "Rejeté", "Doublon"].includes(report.status)).length;
  return <div className="workspace"><div className="page-intro"><div><div className="eyebrow">Espace citoyen · données locales</div><h1>Votre ville, votre signal.</h1><p>Un dépôt documenté devient une action mesurable.</p></div><button className="button button-primary" onClick={onReport}><Plus size={16} /> Nouveau signalement</button></div><DemoNotice>Les points et récompenses restent nuls jusqu’à validation municipale.</DemoNotice><div className="kpi-grid citizen-kpis"><Kpi label="Points disponibles" value={`${state.points}`} detail="Aucun crédit initial" icon={Coins} tone="amber" /><Kpi label="Signalements terrain" value={`${state.reports.length}`} detail={`${active} à traiter`} icon={ClipboardList} tone="green" /><Kpi label="Impact local" value="—" detail="Aucune estimation source" icon={Leaf} tone="blue" /></div><div className="content-grid content-grid-2-1"><div className="panel"><div className="panel-header"><div><div className="eyebrow">Derniers signalements</div><h3>Votre activité récente</h3></div><button className="text-button" onClick={() => onView("reports")}>Tout voir <ChevronRight size={14} /></button></div><div className="report-list">{state.reports.slice(0, 3).map(report => <button className="report-row" key={report.id} onClick={() => onView("reports")}><div className={`report-marker marker-${statusTone[report.status]}`}><MapPinned size={16} /></div><div className="report-main"><strong>{report.location}</strong><span>{report.id} · {report.date} · {report.category}</span></div><div>{statusLabel(report.status)}</div><ChevronRight size={15} className="row-chevron" /></button>)}{state.reports.length === 0 && <div className="empty-state"><MapPinned size={22} /><h3>Aucun signalement local</h3><p>Les signalements apparaîtront ici après saisie réelle.</p></div>}</div></div><div className="panel points-panel"><div className="panel-header"><div><div className="eyebrow">Progression</div><h3>Engagement citoyen</h3></div><Trophy size={20} className="panel-accent" /></div><div className="level-ring"><div><strong>{state.points}</strong><span>points</span></div></div><p>Aucun seuil ou récompense n’est prérempli.</p><div className="progress"><i style={{ width: `${Math.min(state.points / 5, 100)}%` }} /></div><button className="text-button" onClick={() => onView("rewards")}>Voir les règles <ArrowUpRight size={14} /></button></div></div><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} compact /></div>;
}

function ReportForm({ onSubmit, onCancel }: { onSubmit: (report: Report) => void; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Plastique");
  const [severity, setSeverity] = useState<Report["severity"]>("Moyenne");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState(false);
  const [gps, setGps] = useState(false);
  const [voice, setVoice] = useState(false);
  const submit = () => onSubmit({ id: `BC-2026-${Math.floor(100 + Math.random() * 899)}`, date: "14 oct. 2026", arrondissement: "Bohicon II", category, severity, location, lat: 7.178, lng: 2.067, description: description || "Signalement créé depuis le formulaire local.", status: "En attente", priority: severity === "Élevée" ? "Haute" : severity === "Moyenne" ? "Moyenne" : "Basse", provenance: "terrain", rewardCredited: false, history: [{ label: "Signalement reçu", date: "14 oct. · maintenant", note: "En attente de vérification municipale" }] });
  return <div className="workspace narrow-workspace"><div className="page-intro"><div><div className="eyebrow">Nouveau signalement · Étape {step}/4</div><h1>Documenter un dépôt.</h1><p>Quelques informations suffisent pour déclencher la chaîne de vérification.</p></div><button className="icon-button" onClick={onCancel}><X size={18} /></button></div><div className="stepper"><span className={step >= 1 ? "active" : ""}><b>1</b> Médias</span><i /><span className={step >= 2 ? "active" : ""}><b>2</b> Localisation</span><i /><span className={step >= 3 ? "active" : ""}><b>3</b> Description</span><i /><span className={step >= 4 ? "active" : ""}><b>4</b> Vérifier</span></div><div className="form-panel"><DemoNotice>Les captures photo, GPS et vocal ne sont revendiquées que si vous les activez réellement.</DemoNotice>{step === 1 && <div className="form-section"><div className="upload-zone"><div className="upload-icon"><Camera size={21} /></div><h3>Ajouter une photo ou une vidéo</h3><p>Utile pour qualifier le dépôt. Aucune image n’est capturée sans sélection réelle.</p><button className={`button ${media ? "button-primary" : "button-outline"}`} onClick={() => setMedia(!media)}>{media ? <Check size={16} /> : <Upload size={16} />}{media ? "Média de démonstration ajouté" : "Choisir un fichier"}</button></div><div className="form-actions"><button className="text-button" onClick={onCancel}>Annuler</button><button className="button button-primary" onClick={() => setStep(2)}>Continuer <ChevronRight size={15} /></button></div></div>}{step === 2 && <div className="form-section"><div className="location-preview"><OperationalMap reports={[]} hubs={[]} interventions={[]} importedLayers={[]} compact /><div className="location-overlay"><LocateFixed size={16} /><span>{gps ? "Position GPS activée" : "Position manuelle sélectionnée"}</span></div></div><div className="field"><label>Lieu du dépôt</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex. rue, marché, quartier" /></div><button className={`button button-outline ${gps ? "selected-button" : ""}`} onClick={() => setGps(!gps)}><LocateFixed size={16} />{gps ? "GPS activé" : "Utiliser ma position"}</button><div className="form-actions"><button className="button button-ghost" onClick={() => setStep(1)}>Retour</button><button className="button button-primary" onClick={() => setStep(3)}>Continuer <ChevronRight size={15} /></button></div></div>}{step === 3 && <div className="form-section"><div className="field"><label>Description courte</label><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez ce que vous observez…" rows={4} /></div><div className="field"><label>Catégorie principale</label><div className="choice-grid">{CATEGORIES.map(item => <button key={item} className={`choice-button ${category === item ? "choice-selected" : ""}`} onClick={() => setCategory(item)}><Recycle size={15} />{item}</button>)}</div></div><div className="field"><label>Niveau apparent de gravité</label><div className="severity-row">{(["Faible", "Moyenne", "Élevée"] as const).map(item => <button key={item} className={`severity-button severity-${item.toLowerCase()} ${severity === item ? "selected" : ""}`} onClick={() => setSeverity(item)}><span />{item}</button>)}</div></div><button className={`button button-outline ${voice ? "selected-button" : ""}`} onClick={() => setVoice(!voice)}><MessageSquare size={16} />{voice ? "Message vocal ajouté" : "Ajouter un message vocal"}</button><div className="form-actions"><button className="button button-ghost" onClick={() => setStep(2)}>Retour</button><button className="button button-primary" onClick={() => setStep(4)}>Vérifier <ChevronRight size={15} /></button></div></div>}{step === 4 && <div className="form-section"><div className="review-card"><div className="review-icon"><FileCheck2 size={21} /></div><div><div className="eyebrow">Prêt à envoyer</div><h3>{category} · gravité {severity.toLowerCase()}</h3><p>{location}</p><span>{description || "Aucune description complémentaire."}</span></div></div><div className="review-grid"><div><span>Photo / vidéo</span><strong>{media ? "Démo ajoutée" : "Non fournie"}</strong></div><div><span>Position</span><strong>{gps ? "GPS de démo" : "Manuelle"}</strong></div><div><span>Message vocal</span><strong>{voice ? "Démo ajoutée" : "Non fourni"}</strong></div><div><span>Statut après envoi</span><strong>En attente</strong></div></div><DemoNotice>Après validation municipale, 25 points seront crédités une seule fois.</DemoNotice><div className="form-actions"><button className="button button-ghost" onClick={() => setStep(3)}>Modifier</button><button className="button button-primary button-large" onClick={submit}><Send size={16} /> Envoyer le signalement</button></div></div>}</div></div>;
}

function CitizenReports({ reports, onView }: { reports: Report[]; onView: (view: ViewKey) => void }) {
  const [filter, setFilter] = useState("Tous");
  const list = filter === "Tous" ? reports : reports.filter(report => report.status === filter);
  return <div className="workspace"><SectionHeading eyebrow="Espace citoyen" title="Mes signalements" description="Suivez chaque dépôt, son statut et la suite donnée par la mairie." action={<button className="button button-primary" onClick={() => onView("report")}><Plus size={16} /> Signaler</button>} /><div className="filter-bar"><Search size={16} /><input placeholder="Rechercher un lieu ou un identifiant" /><select value={filter} onChange={e => setFilter(e.target.value)}><option>Tous</option>{["En attente", "En cours de vérification", "Validé", "Traité", "Doublon", "Rejeté"].map(item => <option key={item}>{item}</option>)}</select><button className="icon-button"><SlidersHorizontal size={16} /></button></div><div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Signalement</th><th>Localisation</th><th>Catégorie</th><th>Statut</th><th>Dernier événement</th><th /></tr></thead><tbody>{list.map(report => <tr key={report.id}><td><strong>{report.id}</strong><span>{report.date} · {report.provenance === "demo" ? "Démonstration" : "Terrain"}</span></td><td>{report.location}<span>{report.arrondissement}</span></td><td><Tag tone="green">{report.category}</Tag></td><td>{statusLabel(report.status)}</td><td>{report.history.at(-1)?.label}<span>{report.history.at(-1)?.date}</span></td><td><button className="icon-button"><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div></div></div>;
}

function PointsWallet({ state, onView }: { state: DemoState; onView: (view: ViewKey) => void }) {
  return <div className="workspace"><SectionHeading eyebrow="Portefeuille citoyen" title="Mes points & récompenses" description="Les crédits sont attribués uniquement après validation d’un signalement." action={<button className="button button-outline" onClick={() => onView("rewards")}><Trophy size={16} /> Voir les récompenses</button>} /><div className="wallet-hero"><div><span className="eyebrow">Solde disponible</span><strong>{state.points}</strong><span>points d’engagement</span></div><div className="wallet-orbit"><Coins size={31} /></div><div className="wallet-level"><span>Niveau 3</span><strong>Éclaireur de quartier</strong><div className="progress"><i style={{ width: "68%" }} /></div><small>160 points avant le prochain niveau</small></div></div><div className="content-grid content-grid-1-1"><div className="panel"><div className="panel-header"><h3>Historique du portefeuille</h3><Tag tone="blue">Anti-double-crédit actif</Tag></div><div className="ledger">{state.ledger.map(entry => <div className="ledger-row" key={entry.id}><div className={`ledger-icon ${entry.kind === "credit" ? "ledger-credit" : "ledger-debit"}`}>{entry.kind === "credit" ? <ArrowUpRight size={15} /> : <ArrowDownToLine size={15} />}</div><div><strong>{entry.label}</strong><span>{entry.date}</span></div><b className={entry.kind === "credit" ? "positive" : "negative"}>{entry.kind === "credit" ? "+" : ""}{entry.amount} pts</b></div>)}</div></div><div className="panel"><div className="panel-header"><h3>Règles de confiance</h3><ShieldCheck size={20} className="panel-accent" /></div><div className="trust-list"><div><CheckCircle2 size={16} /><span>Un signalement = un identifiant unique</span></div><div><CheckCircle2 size={16} /><span>Validation mairie avant tout crédit</span></div><div><CheckCircle2 size={16} /><span>Historique conservé pour chaque action</span></div><div><CheckCircle2 size={16} /><span>Récompenses simulées, confirmation requise</span></div></div></div></div></div>;
}

function Rewards() {
  const rewards = [{ title: "Panier local", cost: 500, note: "Produits issus d’une filière locale", icon: "PL" }, { title: "Kit propreté", cost: 800, note: "Gants + sacs réutilisables", icon: "KP" }, { title: "Badge Ambassadeur", cost: 1200, note: "Reconnaissance citoyenne", icon: "BA" }];
  return <div className="workspace"><SectionHeading eyebrow="Récompenses simulées" title="Faire du propre une habitude." description="Ces contreparties sont fictives dans ce prototype et nécessitent une confirmation avant utilisation." /><div className="reward-grid">{rewards.map(reward => <div className="reward-card" key={reward.title}><div className="reward-symbol">{reward.icon}</div><Tag tone={reward.cost <= 500 ? "green" : "amber"}>{reward.cost} pts</Tag><h3>{reward.title}</h3><p>{reward.note}</p><button className="button button-outline" onClick={() => toast.info("Confirmation simulée", { description: `La récompense « ${reward.title} » serait confirmée dans une version connectée.` })}>Utiliser mes points <ArrowUpRight size={14} /></button></div>)}</div></div>;
}

function CollectorOverview({ state, onView }: { state: DemoState; onView: (view: ViewKey) => void }) {
  const validated = state.collections.filter(item => item.validatedKg).reduce((sum, item) => sum + (item.validatedKg ?? 0), 0);
  return <div className="workspace"><div className="page-intro"><div><div className="eyebrow">Collecteur · COL-014</div><h1>Bonjour Issaka.</h1><p>Votre tournée commence par une collecte sûre et vérifiée.</p></div><button className="button button-primary" onClick={() => onView("collection")}><Plus size={16} /> Nouvelle collecte</button></div><DemoNotice>Les distances, tarifs et gains sont simulés et configurables.</DemoNotice><div className="kpi-grid"><Kpi label="Quantité validée" value={`${validated} kg`} detail="sur les 30 derniers jours" icon={Scale} tone="green" /><Kpi label="Gains cumulés" value={formatFcfa(48900)} detail="+9 200 FCFA ce mois" icon={Coins} tone="amber" /><Kpi label="Note qualité" value="94 / 100" detail="Très bonne régularité" icon={ShieldCheck} tone="blue" /><Kpi label="Autorisation" value="Active" detail="Valide jusqu’au 31 déc. 2026" icon={CheckCircle2} tone="green" /></div><div className="content-grid content-grid-2-1"><div className="panel"><div className="panel-header"><div><div className="eyebrow">Dernières collectes</div><h3>À confirmer au point</h3></div><button className="text-button" onClick={() => onView("history")}>Historique <ChevronRight size={14} /></button></div><CollectionTable collections={state.collections.slice(0, 3)} /></div><div className="panel training-card"><div className="training-icon"><BookOpen size={23} /></div><Tag tone="amber">Formation à jour</Tag><h3>Sécurité & tri</h3><p>Votre quiz est réussi à 90 %. Revoyez les déchets dangereux avant votre prochaine tournée.</p><button className="text-button" onClick={() => onView("training")}>Revoir la formation <ArrowUpRight size={14} /></button></div></div><div className="content-grid content-grid-1-1"><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} compact /><div className="panel tariff-panel"><div className="panel-header"><h3>Grille tarifaire fictive</h3><Tag tone="amber">Configurable</Tag></div>{[["Plastique", "150 FCFA/kg"], ["Organique", "80 FCFA/kg"], ["Papier / carton", "120 FCFA/kg"], ["Métal", "220 FCFA/kg"]].map(([cat, price]) => <div className="tariff-row" key={cat}><span>{cat}</span><strong>{price}</strong></div>)}<small className="panel-footnote">Les montants sont une hypothèse de simulation, non un tarif municipal.</small></div></div></div>;
}

function CollectionTable({ collections }: { collections: Collection[] }) {
  return <div className="collection-list">{collections.map(collection => <div className="collection-row" key={collection.id}><div className="collection-date"><strong>{collection.date.split(" ")[0]}</strong><span>{collection.date.split(" ").slice(1).join(" ")}</span></div><div><strong>{collection.category}</strong><span>{collection.hub} · {collection.id}</span></div><div className="quantity-stack"><span>Déclarée <b>{collection.declaredKg} kg</b></span><span>Vérifiée <b>{collection.verifiedKg ?? "—"} kg</b></span><span>Validée <b>{collection.validatedKg ?? "—"} kg</b></span></div>{statusLabel(collection.status)}</div>)}</div>;
}

function Training() {
  const questions = ["Quel équipement protège les mains lors de la collecte ?", "Que faire d’un déchet médical piquant ?", "Pourquoi séparer les matières au point de regroupement ?", "Quelle information doit accompagner une pesée ?", "Que faire en cas de fuite d’un sac ?", "Un verre cassé se manipule-t-il à mains nues ?", "Quel est le rôle d’un gilet visible ?", "Quand peut-on déclarer une collecte terminée ?", "Pourquoi éviter de compacter un déchet dangereux ?", "Que faire si un point est à capacité ?"];
  const [answers, setAnswers] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false, 8: true, 9: true });
  const score = Object.values(answers).filter(Boolean).length * 10;
  return <div className="workspace"><SectionHeading eyebrow="Parcours collecteur" title="Formation & quiz sécurité" description="Le seuil de réussite est fixé à 80 %. Vous pouvez recommencer autant que nécessaire." action={<Tag tone={score >= 80 ? "green" : "amber"}>{score}% · {score >= 80 ? "Réussi" : "À reprendre"}</Tag>} /><div className="training-layout"><div className="panel training-content"><div className="training-banner"><ShieldCheck size={24} /><div><strong>Les bons réflexes protègent toute la chaîne.</strong><span>EPI · risques · tri · transport · déchets dangereux</span></div></div><div className="quiz-list">{questions.map((question, index) => <div className="quiz-row" key={question}><div className="quiz-number">{String(index + 1).padStart(2, "0")}</div><div><strong>{question}</strong><span>Réponse non enregistrée</span></div><button className={`toggle ${answers[index] ? "toggle-on" : ""}`} onClick={() => setAnswers(current => ({ ...current, [index]: !current[index] }))}><i /></button></div>)}</div><button className="button button-primary" onClick={() => toast.success("Résultat enregistré", { description: `${score}% · Le résultat est visible dans votre profil collecteur.` })}><CheckCircle2 size={16} /> Enregistrer mon résultat</button></div><div className="panel training-side"><div className="eyebrow">Progression</div><div className="big-score">{score}<small>%</small></div><div className="progress"><i style={{ width: `${score}%` }} /></div><p>{score >= 80 ? "Autorisation de collecte maintenue." : "Il vous manque quelques bonnes réponses pour valider la formation."}</p><div className="safety-note"><CircleAlert size={16} /><span>Ne jamais manipuler les déchets dangereux sans protocole ni équipement adapté.</span></div></div></div></div>;
}

function NewCollection({ state, onSaved }: { state: DemoState; onSaved: (collection: Collection) => void }) {
  const [category, setCategory] = useState("Plastique");
  const [declared, setDeclared] = useState("25");
  const [hub, setHub] = useState(state.hubs[0]?.name ?? "Point Agbokou");
  const [submitted, setSubmitted] = useState(false);
  const save = () => { const collection: Collection = { id: `COLL-${Math.floor(100 + Math.random() * 899)}`, date: "14 oct. 2026", category, declaredKg: Number(declared) || 0, verifiedKg: null, validatedKg: null, hub, status: "Déclarée", paid: false }; onSaved(collection); setSubmitted(true); };
  return <div className="workspace narrow-workspace"><SectionHeading eyebrow="Nouvelle collecte" title="Déclarer une collecte." description="La quantité vérifiée puis validée par le responsable du point sera la seule à produire un gain." /><div className="form-panel">{submitted ? <div className="success-state"><div className="success-icon"><CheckCircle2 size={29} /></div><div className="eyebrow">Collecte enregistrée</div><h2>Votre déclaration est en attente de pesée.</h2><p>Le point <strong>{hub}</strong> doit confirmer la quantité avant tout paiement simulé.</p><button className="button button-primary" onClick={() => setSubmitted(false)}>Déclarer une autre collecte</button></div> : <><div className="form-section"><div className="field"><label>Catégories transportées</label><div className="choice-grid">{CATEGORIES.slice(0, 6).map(item => <button key={item} className={`choice-button ${category === item ? "choice-selected" : ""}`} onClick={() => setCategory(item)}><Recycle size={15} />{item}</button>)}</div></div><div className="field"><label>Quantité déclarée (kg)</label><div className="input-with-suffix"><input value={declared} onChange={e => setDeclared(e.target.value)} type="number" min="0" /><span>kg</span></div></div><div className="field"><label>Point de regroupement</label><div className="hub-options">{state.hubs.map(item => <button key={item.id} className={`hub-option ${hub === item.name ? "hub-selected" : ""}`} onClick={() => setHub(item.name)}><div><strong>{item.name}</strong><span>{item.location} · distance simulée 0,8 km</span><small>{item.accepted.join(" · ")}</small></div><div className="hub-capacity"><b>{item.capacity - item.received} kg</b><span>capacité restante</span></div></button>)}</div></div><DemoNotice>La distance est une estimation de démonstration ; le poids déclaré n’est pas encore un poids validé.</DemoNotice><div className="form-actions"><button className="button button-primary" onClick={save}><Scale size={16} /> Enregistrer la déclaration</button></div></div></>}</div></div>;
}

function CollectorHistory({ collections }: { collections: Collection[] }) {
  return <div className="workspace"><SectionHeading eyebrow="Transparence des gains" title="Historique des collectes" description="Déclarée, vérifiée, validée : les trois quantités restent visibles." action={<Tag tone="amber">Tarifs fictifs</Tag>} /><div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Collecte</th><th>Flux</th><th>Point</th><th>Déclarée</th><th>Vérifiée</th><th>Validée</th><th>Gain</th><th>Statut</th></tr></thead><tbody>{collections.map(item => <tr key={item.id}><td><strong>{item.id}</strong><span>{item.date}</span></td><td><Tag tone="green">{item.category}</Tag></td><td>{item.hub}</td><td>{item.declaredKg} kg</td><td>{item.verifiedKg ?? "—"}</td><td>{item.validatedKg ?? "—"}</td><td><strong>{item.validatedKg ? formatFcfa(item.validatedKg * 150) : "En attente"}</strong></td><td>{statusLabel(item.status)}</td></tr>)}</tbody></table></div></div></div>;
}

function MairieOverview({ state, onView, onStatus }: { state: DemoState; onView: (view: ViewKey) => void; onStatus: (id: string, status: ReportStatus) => void }) {
  const treated = state.reports.filter(r => r.status === "Traité").length;
  const recurrent = state.reports.filter(r => r.priority === "Haute").length;
  const categoryData = CATEGORIES.slice(0, 5).map(category => ({ name: category.split(" ")[0], value: state.reports.filter(r => r.category === category).length }));
  const trendData: { day: string; signalements: number; interventions: number }[] = [];
  return <div className="workspace mairie-workspace"><div className="page-intro"><div><div className="eyebrow">Pilotage municipal · données reçues</div><h1>Voir le terrain. Décider juste.</h1><p>La situation de la propreté à Bohicon, en un regard.</p></div><div className="intro-actions"><button className="button button-outline" onClick={() => onView("reports-mairie")}><FileText size={16} /> Exporter un rapport</button><button className="button button-primary" onClick={() => onView("interventions")}><Plus size={16} /> Créer une intervention</button></div></div><DemoNotice>Les indicateurs sont calculés uniquement à partir des données terrain et des saisies validées.</DemoNotice><div className="kpi-grid mairie-kpis"><Kpi label="Dépôts recensés" value={`${state.reports.length}`} detail="Source terrain" icon={Trash2} tone="green" /><Kpi label="À traiter" value={`${state.reports.filter(r => !["Traité", "Rejeté", "Doublon"].includes(r.status)).length}`} detail="Selon statut courant" icon={CircleAlert} tone="red" /><Kpi label="Dépôts traités" value={`${treated}`} detail="Source terrain" icon={CheckCircle2} tone="blue" /><Kpi label="Sites récurrents" value={`${recurrent}`} detail="Règle proximité + répétition" icon={RefreshCcw} tone="amber" /><Kpi label="Collecteurs actifs" value={`${state.collectors.filter(c => c.status === "Actif").length}`} detail="Aucun profil importé" icon={Users} tone="green" /><Kpi label="Quantités collectées" value={`${state.collections.reduce((sum, item) => sum + (item.validatedKg ?? 0), 0)} kg`} detail="Collectes validées" icon={Scale} tone="blue" /></div><div className="dashboard-grid"><div className="panel chart-panel"><div className="panel-header"><div><div className="eyebrow">Tendance opérationnelle</div><h3>Signalements & interventions</h3></div><Tag tone="blue">Données disponibles uniquement</Tag></div><ResponsiveContainer width="100%" height={230}><RechartsLineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3ebe5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#748178" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#748178" }} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe9e0", fontSize: 12 }} /><Line type="monotone" dataKey="signalements" name="Signalements" stroke="#0e4f3c" strokeWidth={3} dot={{ r: 3, fill: "#0e4f3c" }} /><Line type="monotone" dataKey="interventions" name="Interventions" stroke="#d9a441" strokeWidth={3} dot={{ r: 3, fill: "#d9a441" }} /></RechartsLineChart></ResponsiveContainer><div className="chart-legend"><span><i className="legend-line line-green" />Signalements</span><span><i className="legend-line line-amber" />Interventions</span></div></div><div className="panel chart-panel"><div className="panel-header"><div><div className="eyebrow">Répartition</div><h3>Catégories observées</h3></div><Tag tone="green">Source terrain</Tag></div><ResponsiveContainer width="100%" height={230}><BarChart data={categoryData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3ebe5" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#748178" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#748178" }} /><Tooltip cursor={{ fill: "#f2f6f1" }} contentStyle={{ borderRadius: 12, border: "1px solid #dfe9e0", fontSize: 12 }} /><Bar dataKey="value" name="Occurrences" radius={[6, 6, 0, 0]}>{categoryData.map((_, index) => <Cell key={index} fill={["#0e4f3c", "#8bbd78", "#d9a441", "#c9d98b", "#67877a"][index]} />)}</Bar></BarChart></ResponsiveContainer></div></div><div className="content-grid content-grid-2-1"><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} onSelect={() => onView("deposits")} /><div className="panel priority-panel"><div className="panel-header"><div><div className="eyebrow">À décider aujourd’hui</div><h3>Sites prioritaires</h3></div><button className="text-button" onClick={() => onView("deposits")}>Voir tous <ChevronRight size={14} /></button></div>{state.reports.filter(r => r.priority === "Haute").slice(0, 3).map(report => <div className="priority-row" key={report.id}><div className="priority-score">{report.severity === "Élevée" ? "A" : "B"}</div><div><strong>{report.location}</strong><span>{report.id} · {report.arrondissement}</span></div><button className="mini-action" onClick={() => onStatus(report.id, "En cours de vérification")} title="Affecter une vérification"><ArrowUpRight size={14} /></button></div>)}<div className="priority-footer"><Sparkles size={14} /> Scores basés sur les attributs terrain disponibles ; à confirmer.</div></div></div></div>;
}

function Deposits({ state, onStatus }: { state: DemoState; onStatus: (id: string, status: ReportStatus) => void }) {
  const [query, setQuery] = useState("");
  const [arrondissement, setArrondissement] = useState("Tous");
  const [selected, setSelected] = useState<Report | null>(null);
  const availableArrondissements = Array.from(new Set([...ARRONDISSEMENTS, ...state.reports.map(report => report.arrondissement)])).sort();
  const list = state.reports.filter(report => `${report.location} ${report.id} ${report.category}`.toLowerCase().includes(query.toLowerCase())).filter(report => arrondissement === "Tous" || report.arrondissement === arrondissement);
  return <div className="workspace mairie-workspace"><SectionHeading eyebrow="Données terrain" title="Dépôts sauvages" description="Les doublons potentiels sont signalés, jamais fusionnés automatiquement." action={<Tag tone="green">{state.reports.length} entités</Tag>} /><div className="filter-bar"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un lieu, un code ou une catégorie" /><select value={arrondissement} onChange={e => setArrondissement(e.target.value)}><option>Tous</option>{availableArrondissements.map(item => <option key={item}>{item}</option>)}</select><button className="button button-outline"><SlidersHorizontal size={15} /> Filtres</button></div><div className="deposits-layout"><div className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Site</th><th>Provenance</th><th>Catégorie</th><th>Priorité</th><th>Statut</th><th>Action</th></tr></thead><tbody>{list.map(report => <tr key={report.id} className={selected?.id === report.id ? "row-selected" : ""}><td><button className="table-link" onClick={() => setSelected(report)}><strong>{report.location}</strong><span>{report.id} · {report.date}</span></button></td><td><Tag tone={report.provenance === "terrain" ? "blue" : "neutral"}>{report.provenance === "terrain" ? "Terrain importé" : "Saisie utilisateur"}</Tag></td><td>{report.category}</td><td><span className={`priority priority-${report.priority.toLowerCase()}`}><i />{report.priority}</span></td><td>{statusLabel(report.status)}</td><td><select className="status-select" value={report.status} onChange={e => onStatus(report.id, e.target.value as ReportStatus)}><option>En attente</option><option>En cours de vérification</option><option>Validé</option><option>Rejeté</option><option>Doublon</option><option>Traité</option></select></td></tr>)}</tbody></table></div></div>{selected ? <div className="panel detail-panel"><div className="panel-header"><div><Tag tone={selected.provenance === "terrain" ? "blue" : "neutral"}>{selected.provenance === "terrain" ? "Donnée terrain" : "Saisie utilisateur"}</Tag><h3>{selected.id}</h3></div><button className="icon-button" onClick={() => setSelected(null)}><X size={16} /></button></div><div className="detail-location"><MapPinned size={16} /><span>{selected.location}<small>{selected.arrondissement} · coordonnées du fichier source conservées</small></span></div><div className="detail-grid"><div><span>Catégorie</span><strong>{selected.category}</strong></div><div><span>Gravité</span><strong>{selected.severity}</strong></div><div><span>Priorité</span><strong>{selected.priority}</strong></div><div><span>Statut</span><strong>{selected.status}</strong></div></div><p className="detail-description">{selected.description}</p><div className="detail-actions"><button className="button button-primary" onClick={() => onStatus(selected.id, "Validé")}><CheckCircle2 size={15} /> Valider</button><button className="button button-outline" onClick={() => toast.success("Intervention créée", { description: `Une intervention est liée à ${selected.id}.` })}><Plus size={15} /> Intervention</button></div><div className="detail-history"><div className="eyebrow">Historique</div><MiniTimeline history={selected.history} /></div></div> : <div className="panel select-hint"><MapPinned size={27} /><h3>Sélectionnez un site</h3><p>La fiche détaillée affichera l’historique, les coordonnées et les actions disponibles.</p></div>}</div></div>;
}

function Interventions({ interventions }: { interventions: Intervention[] }) {
  const [filter, setFilter] = useState("Toutes");
  const list = filter === "Toutes" ? interventions : interventions.filter(item => item.status === filter);
  return <div className="workspace mairie-workspace"><SectionHeading eyebrow="Opérations terrain" title="Interventions" description="Tableau de suivi des passages, contrôles et résultats associés aux sites." action={<button className="button button-primary" onClick={() => toast.info("Création simulée", { description: "Dans la version connectée, le responsable et la date seraient enregistrés en base." })}><Plus size={16} /> Nouvelle intervention</button>} /><div className="filter-chips"><span>Filtrer par statut</span>{["Toutes", "À planifier", "Planifiée", "En cours", "Terminée", "À contrôler"].map(item => <button className={filter === item ? "chip-active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="intervention-board">{list.map(item => <div className="panel intervention-card" key={item.id}><div className="intervention-card-top"><Tag tone={item.priority === "Haute" ? "red" : item.priority === "Moyenne" ? "amber" : "green"}>{item.priority}</Tag>{statusLabel(item.status)}<button className="icon-button"><MoreHorizontal size={16} /></button></div><div className="eyebrow">{item.id} · {item.plannedDate}</div><h3>{item.site}</h3><p>{item.comment}</p><div className="intervention-meta"><span><Users size={14} />{item.responsible}</span><span><MapPinned size={14} />{item.arrondissement}</span></div><div className="intervention-footer"><span>Historique conservé</span><button className="text-button" onClick={() => toast.success("Fiche ouverte", { description: `${item.id} · ${item.status}` })}>Voir la fiche <ChevronRight size={14} /></button></div></div>)}</div></div>;
}

function MairieSimplePage({ kind, state, onView }: { kind: "collectors" | "hubs" | "valorisation" | "routes" | "reports-mairie"; state: DemoState; onView: (view: ViewKey) => void }) {
  const title = kind === "collectors" ? "Collecteurs indépendants" : kind === "hubs" ? "Points de regroupement" : kind === "valorisation" ? "Valorisation" : kind === "routes" ? "Tournées de collecte" : "Rapports municipaux";
  const description = kind === "collectors" ? "Les profils apparaîtront après import ou inscription validée." : kind === "hubs" ? "Les points apparaîtront après réception de données vérifiées." : kind === "valorisation" ? "Aucune quantité n’est affichée sans collecte validée et pesée traçable." : kind === "routes" ? "Les tournées restent indisponibles sans points, collecteurs et interventions validés." : "Les rapports seront disponibles après validation des données terrain.";
  const count = kind === "collectors" ? state.collectors.length : kind === "hubs" ? state.hubs.length : kind === "valorisation" ? state.collections.length : kind === "routes" ? state.interventions.length : state.reports.length;
  return <div className="workspace mairie-workspace"><SectionHeading eyebrow="Données vérifiées uniquement" title={title} description={description} action={<Tag tone="blue">{count} élément{count > 1 ? "s" : ""}</Tag>} /><div className="panel empty-state"><div className="upload-icon"><MapPinned size={24} /></div><h3>{count === 0 ? "Aucune donnée disponible" : "Les données sont en cours de qualification"}</h3><p>BOHICON CLEAN n’invente plus de collecteurs, points, quantités, tournées ou rapports. Ajoutez une source terrain ou utilisez le parcours concerné pour créer une donnée réelle.</p>{kind === "reports-mairie" && <button className="button button-primary" onClick={() => onView("deposits")}>Voir les dépôts terrain <ArrowUpRight size={15} /></button>}</div></div>;
}

function Analysis({ state }: { state: DemoState }) {
  const [weights, setWeights] = useState({ density: 0.4, coverage: 0.25, distance: 0.2, sensitive: 0.15 });
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const normalize = (key: keyof typeof weights, value: number) => setWeights(current => ({ ...current, [key]: Math.max(0, Math.min(1, value)) }));
  const sectors = ARRONDISSEMENTS.map(name => { const reports = state.reports.filter(report => report.arrondissement === name); const score = Math.min(100, reports.length ? Math.round((reports.length / Math.max(state.reports.length, 1)) * 100) : 0); return { name, score, note: reports.length ? `${reports.length} dépôt${reports.length > 1 ? "s" : ""} terrain · score descriptif` : "Aucun dépôt source rattaché" }; });
  return <div className="workspace mairie-workspace"><SectionHeading eyebrow="Aide à la décision" title="Analyse multicritère" description="Les scores sont calculés sur les dépôts terrain présents ; les critères sans données restent explicitement non renseignés." action={<Tag tone={Math.abs(total - 1) < 0.01 ? "green" : "red"}>Somme des poids · {Math.round(total * 100)}%</Tag>} /><div className="analysis-layout"><div className="panel criteria-panel"><div className="panel-header"><div><h3>Critères activés</h3><span className="panel-subtitle">Les pondérations sont des hypothèses configurables</span></div><SlidersHorizontal size={18} className="panel-accent" /></div>{[["density", "Densité des dépôts", "Calculée sur les entités terrain"], ["coverage", "Couverture du service", "Non disponible sans points validés"], ["distance", "Distance aux points", "Non disponible sans points validés"], ["sensitive", "Zones sensibles", "Non disponible dans les sources reçues"]].map(([key, label, note]) => <div className="criterion" key={key}><div className="criterion-head"><div><strong>{label}</strong><span>{note}</span></div><b>{Math.round(weights[key as keyof typeof weights] * 100)}%</b></div><input type="range" min="0" max="100" value={Math.round(weights[key as keyof typeof weights] * 100)} onChange={e => normalize(key as keyof typeof weights, Number(e.target.value) / 100)} /></div>)}<div className="analysis-footnote"><CircleAlert size={15} /> Un score n’est jamais une vérité absolue et ne remplace pas la vérification municipale.</div></div><div className="panel score-panel"><div className="panel-header"><div><h3>Priorité par arrondissement</h3><span className="panel-subtitle">Résultat descriptif sur les sources disponibles</span></div><Tag tone="amber">À interpréter</Tag></div>{sectors.map(sector => <div className="sector-row" key={sector.name}><div className={`sector-score score-${sector.score >= 70 ? "high" : sector.score >= 45 ? "medium" : "low"}`}>{sector.score || "—"}</div><div><strong>{sector.name}</strong><span>{sector.note}</span></div><span className={`priority priority-${sector.score >= 70 ? "haute" : sector.score >= 45 ? "moyenne" : "basse"}`}><i />{sector.score >= 70 ? "Élevée" : sector.score >= 45 ? "Moyenne" : "Faible"}</span></div>)}</div></div><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} /></div>;
}

function Intelligence({ state }: { state: DemoState }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(`Résumé des sources : ${state.reports.length} dépôt${state.reports.length > 1 ? "s" : ""} terrain chargé${state.reports.length > 1 ? "s" : ""}. Les recommandations resteront limitées aux attributs réellement disponibles.`);
  const ask = () => { if (!question.trim()) return; setAnswer(`Lecture locale de « ${question} » : ${state.reports.length} dépôt${state.reports.length > 1 ? "s" : ""} terrain est/sont disponible(s). Aucune IA externe ni donnée inventée n’est utilisée ; cette réponse doit être vérifiée par le responsable.`); setQuestion(""); };
  const priorityReports = state.reports.filter(report => report.priority === "Haute").slice(0, 3);
  return <div className="workspace mairie-workspace"><SectionHeading eyebrow="Assistance à la décision" title="Intelligence & recommandations" description="Les recommandations restent adossées aux données terrain et n’inventent aucun site ou flux." action={<Tag tone="purple">IA non connectée</Tag>} /><div className="ai-layout"><div className="panel ai-chat-panel"><div className="ai-chat-head"><div className="ai-orb"><Sparkles size={19} /></div><div><strong>Assistant Bohicon Clean</strong><span>Règles locales · aucune donnée fictive</span></div></div><div className="ai-answer"><div className="eyebrow">Situation source</div><p>{answer}</p></div><div className="ai-input"><input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder="Interroger les données terrain…" /><button className="button button-primary" onClick={ask}><Send size={15} /></button></div></div><div className="recommendation-stack">{priorityReports.length ? priorityReports.map(report => <div className="panel recommendation-card" key={report.id}><div className="recommendation-head"><div className="recommendation-icon recommendation-red"><Target size={16} /></div><Tag tone="red">Priorité source</Tag></div><h3>{report.location}</h3><p>{report.description || "Aucune description complémentaire dans la source."}</p><span className="recommendation-source">Source : {report.id} · attributs terrain</span></div>) : <div className="panel empty-state"><Target size={24} /><h3>Aucune recommandation calculable</h3><p>Aucun dépôt terrain de priorité haute n’est disponible.</p></div>}</div></div></div>;
}

function GeoJSONImport({ state, onImported }: { state: DemoState; onImported: (layer: ImportedLayer) => void }) {
  const [inspection, setInspection] = useState<GeoInspection | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; setFileName(file.name); setParseError(""); const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); const displayGeoJSON = normalizeGeoJSONForDisplay(parsed); setInspection(inspectGeoJSON(displayGeoJSON)); (window as any).__bohiconGeoJSON = displayGeoJSON; } catch { setInspection(null); setParseError("JSON illisible : le fichier original n’a pas été modifié."); } }; reader.readAsText(file); };
  const save = () => { if (!inspection || !inspection.valid) return; const parsed = (window as any).__bohiconGeoJSON; const { warnings } = inspectionSummary(inspection); const layer: ImportedLayer = { id: `GEO-${Date.now()}`, name: fileName.toLowerCase().includes("arr") ? "Limites des arrondissements" : fileName.toLowerCase().includes("depot") ? "Dépôts sauvages · terrain" : "Couche terrain importée", fileName, geometryTypes: inspection.geometryTypes, featureCount: inspection.featureCount, validCount: inspection.validCount, warningCount: warnings, properties: inspection.propertyKeys, provenance: "terrain", importedAt: new Date().toLocaleString("fr-FR"), sourceCrs: parsed?.sourceCrs, displayCrs: parsed?.displayCrs, geojson: parsed }; onImported(layer); setInspection(null); setFileName(""); toast.success("Couche importée", { description: `${layer.validCount} entités conservées avec leur provenance terrain.` }); };
  return <div className="panel import-panel"><div className="import-drop"><div className="upload-icon"><FileJson size={23} /></div><h3>Importer un GeoJSON</h3><p>Limites d’arrondissements ou dépôts sauvages recensés sur le terrain.</p><label className="button button-primary"><Upload size={16} /> Choisir un fichier<input type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={handleFile} hidden /></label><small>Le fichier original est lu localement et jamais modifié.</small></div>{parseError && <div className="inline-error"><CircleAlert size={15} />{parseError}</div>}{inspection && <div className="inspection-result"><div className="inspection-head"><div><div className="eyebrow">Aperçu · {fileName}</div><h3>{inspection.valid ? "Structure exploitable" : "Anomalies à corriger"}</h3></div>{inspection.valid ? <Tag tone="green">Valide</Tag> : <Tag tone="red">Non importable</Tag>}</div><div className="inspection-stats"><div><strong>{inspection.validCount}</strong><span>entités valides</span></div><div><strong>{inspection.featureCount}</strong><span>entités lues</span></div><div><strong>{inspection.geometryTypes.join(", ") || "—"}</strong><span>géométries</span></div><div><strong>{inspection.propertyKeys.length}</strong><span>champs source</span></div></div>{inspection.propertyKeys.length > 0 && <div className="property-list"><span>Attributs conservés</span>{inspection.propertyKeys.slice(0, 8).map(key => <Tag key={key}>{key}</Tag>)}</div>}<div className="issue-list">{inspection.issues.slice(0, 5).map((issue, index) => <div className={`issue-${issue.kind}`} key={index}>{issue.kind === "error" ? <CircleAlert size={14} /> : <CircleDot size={14} />}{issue.message}</div>)}</div><div className="form-actions"><button className="button button-outline" onClick={() => setInspection(null)}>Annuler</button><button className="button button-primary" disabled={!inspection.valid} onClick={save}><CloudUpload size={15} /> Conserver la couche</button></div></div>}{state.importedLayers.length > 0 && <div className="imported-list"><div className="eyebrow">Couches importées</div>{state.importedLayers.map(layer => <div className="imported-row" key={layer.id}><div className="imported-icon"><FileJson size={16} /></div><div><strong>{layer.name}</strong><span>{layer.fileName} · {layer.validCount} entités · {layer.importedAt}{layer.sourceCrs ? ` · ${layer.sourceCrs} → ${layer.displayCrs}` : ""}</span></div><Tag tone="blue">Terrain</Tag></div>)}</div>}</div>;
}

function Admin({ state, onImported, onReset }: { state: DemoState; onImported: (layer: ImportedLayer) => void; onReset: () => void }) {
  return <div className="workspace"><SectionHeading eyebrow="Administration" title="Données, rôles & configuration" description="Préparer les fichiers terrain, auditer la provenance et remettre la démonstration à zéro." /><div className="admin-grid"><GeoJSONImport state={state} onImported={onImported} /><div className="panel admin-panel"><div className="panel-header"><div><div className="eyebrow">Comptes disponibles</div><h3>Rôles locaux</h3></div><Users size={19} className="panel-accent" /></div>{[["AA", "Aïcha A.", "Citoyenne", "Signalements & points"], ["IA", "Issaka A.", "Collecteur", "Collectes & gains"], ["MA", "Responsable mairie", "Mairie", "Pilotage complet"], ["AD", "Administrateur", "Administration", "Données & paramètres"]].map(([initials, name, role, access]) => <div className="account-row" key={name}><div className="profile-avatar">{initials}</div><div><strong>{name}</strong><span>{role} · {access}</span></div><Tag tone={role === "Mairie" ? "green" : "neutral"}>Démo</Tag></div>)}</div><div className="panel admin-panel"><div className="panel-header"><div><div className="eyebrow">État de la plateforme</div><h3>Fonctions configurées</h3></div><Settings2 size={19} className="panel-accent" /></div><div className="feature-status"><div><CheckCircle2 size={15} /><span>Persistance locale</span><Tag tone="green">Active</Tag></div><div><CheckCircle2 size={15} /><span>Historique métier</span><Tag tone="green">Active</Tag></div><div><CircleAlert size={15} /><span>GPS réel / caméra</span><Tag tone="amber">À connecter</Tag></div><div><CircleAlert size={15} /><span>IA externe</span><Tag tone="amber">Non configurée</Tag></div><div><CircleAlert size={15} /><span>Backend PostGIS</span><Tag tone="amber">Préparé</Tag></div></div><button className="button button-outline reset-button" onClick={onReset}><RefreshCcw size={15} /> Réinitialiser les données locales</button></div></div></div>;
}

export default function Home() {
  const [role, setRole] = useState<Role>("public");
  const [view, setView] = useState<ViewKey>("overview");
  const [state, setState] = useState<DemoState>(() => loadState());
  useEffect(() => { persistState(state); }, [state]);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/depots_sauvages_corrige.geojson")
      .then(response => response.json())
      .then(input => {
        if (cancelled) return;
        const inspection = inspectGeoJSON(input);
        if (!inspection.valid) return;
        setState(current => {
          if (current.importedLayers.some(layer => layer.fileName === "depots_sauvages_corrige.geojson")) return current;
          const terrainReports = terrainReportsFromGeoJSON(input);
          const existingIds = new Set(current.reports.map(report => report.id));
          const { warnings } = inspectionSummary(inspection);
          const layer: ImportedLayer = {
            id: "GEO-DEPOTS-2026",
            name: "Dépôts sauvages · terrain utilisateur",
            fileName: "depots_sauvages_corrige.geojson",
            geometryTypes: inspection.geometryTypes,
            featureCount: inspection.featureCount,
            validCount: inspection.validCount,
            warningCount: warnings,
            properties: inspection.propertyKeys,
            provenance: "terrain",
            importedAt: "10 oct. 2026 · fichier fourni par l’utilisateur",
            geojson: input,
          };
          return {
            ...current,
            reports: [...current.reports, ...terrainReports.filter(report => !existingIds.has(report.id))],
            importedLayers: [...current.importedLayers, layer],
          };
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
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
          if (current.importedLayers.some(layer => layer.fileName === "Arrondissements_Bohicon.geojson")) return current;
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
            importedAt: "10 oct. 2026 · fichier fourni, reprojeté pour affichage",
            sourceCrs: String(input.sourceCrs ?? "EPSG:32631"),
            displayCrs: String(input.displayCrs ?? "EPSG:4326"),
            geojson: input,
          };
          return { ...current, importedLayers: [...current.importedLayers, layer] };
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const switchRole = (nextRole: Role, nextView: ViewKey = "overview") => { setRole(nextRole); setView(nextView); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const reset = () => { const fresh = createInitialState(); setState(fresh); toast.success("Démonstration réinitialisée", { description: "Les données locales ont retrouvé leur état initial." }); };
  const submitReport = (report: Report) => { setState(current => ({ ...current, reports: [report, ...current.reports] })); toast.success("Signalement enregistré", { description: `${report.id} · statut En attente. Aucun point n’est crédité avant validation.` }); setView("reports"); };
  const updateReport = (id: string, status: ReportStatus) => { setState(current => { const reports = current.reports.map(report => { if (report.id !== id) return report; const duplicate = report.status === status; const nextHistory = duplicate ? report.history : [...report.history, { label: `Statut mis à jour · ${status}`, date: "14 oct. · maintenant", note: status === "Validé" ? "Décision municipale enregistrée" : undefined }]; return { ...report, status, history: nextHistory, rewardCredited: report.rewardCredited || status !== "Validé" ? report.rewardCredited : true }; }); const target = current.reports.find(report => report.id === id); const shouldCredit = target && status === "Validé" && !target.rewardCredited; return { ...current, reports, points: shouldCredit ? current.points + 25 : current.points, ledger: shouldCredit ? [{ id: `LED-${Date.now()}`, date: "14 oct. 2026", label: `Signalement ${id} validé`, amount: 25, kind: "credit" }, ...current.ledger] : current.ledger }; }); toast.success(`Statut mis à jour · ${status}`, { description: status === "Validé" ? "Le crédit de points unique est appliqué si nécessaire." : "L’historique du signalement est conservé." }); };
  const saveCollection = (collection: Collection) => { setState(current => ({ ...current, collections: [collection, ...current.collections] })); toast.success("Collecte déclarée", { description: "La pesée vérifiée reste nécessaire avant validation et paiement." }); setView("history"); };
  const saveLayer = (layer: ImportedLayer) => setState(current => {
    const terrainReports = layer.fileName.toLowerCase().includes("depot") ? terrainReportsFromGeoJSON(layer.geojson) : [];
    const existingIds = new Set(current.reports.map(report => report.id));
    return { ...current, reports: [...current.reports, ...terrainReports.filter(report => !existingIds.has(report.id))], importedLayers: [...current.importedLayers, layer] };
  });
  if (role === "public") return <PublicHome onRole={switchRole} />;
  const renderView = () => {
    if (role === "citizen") { if (view === "report") return <ReportForm onSubmit={submitReport} onCancel={() => setView("overview")} />; if (view === "reports") return <CitizenReports reports={state.reports} onView={setView} />; if (view === "points") return <PointsWallet state={state} onView={setView} />; if (view === "rewards") return <Rewards />; if (view === "map") return <div className="workspace"><SectionHeading eyebrow="Proximité" title="Carte citoyenne" description="Dépôts, points et signalements proches dans la vue de démonstration." /><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} /></div>; return <CitizenOverview state={state} onView={setView} onReport={() => setView("report")} />; }
    if (role === "collector") { if (view === "training") return <Training />; if (view === "collection") return <NewCollection state={state} onSaved={saveCollection} />; if (view === "history") return <CollectorHistory collections={state.collections} />; if (view === "map") return <div className="workspace"><SectionHeading eyebrow="Points de regroupement" title="Où déposer aujourd’hui ?" description="Capacités et distances simulées, à confirmer avec les données terrain." /><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} /></div>; return <CollectorOverview state={state} onView={setView} />; }
    if (role === "mairie") { if (view === "map") return <div className="workspace mairie-workspace"><SectionHeading eyebrow="SIG opérationnel" title="Carte de Bohicon" description="Couches terrain reçues dans OpenStreetMap." /><OperationalMap reports={state.reports} hubs={state.hubs} interventions={state.interventions} importedLayers={state.importedLayers} onSelect={() => setView("deposits")} /></div>; if (view === "deposits") return <Deposits state={state} onStatus={updateReport} />; if (view === "interventions") return <Interventions interventions={state.interventions} />; if (["collectors", "hubs", "valorisation", "routes", "reports-mairie"].includes(view)) return <MairieSimplePage kind={view as any} state={state} onView={setView} />; if (view === "analysis") return <Analysis state={state} />; if (view === "intelligence") return <Intelligence state={state} />; return <MairieOverview state={state} onView={setView} onStatus={updateReport} />; }
    return <Admin state={state} onImported={saveLayer} onReset={reset} />;
  };
  return <AppShell role={role} view={view} setRole={switchRole} setView={setView} onReset={reset}>{renderView()}</AppShell>;
}
