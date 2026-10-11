# BOHICON CLEAN — Diagnostic initial

Date : 11 octobre 2026

## 1. Architecture réellement présente

- Frontend React 19 + TypeScript + Vite dans `client/`.
- Un composant central `client/src/pages/Home.tsx` de 446 lignes environ regroupe les espaces public, citoyen, collecteur, mairie et administration.
- Les vues métier utilisent un état `DemoState` persisté dans `localStorage` via `client/src/lib/demo.ts`.
- La carte principale de `Home.tsx` utilise Leaflet et une mosaïque OSM locale ; `client/src/components/Map.tsx` est une intégration Google Maps générique non utilisée par `App.tsx` ou `Home.tsx`.
- `client/src/App.tsx` ne route actuellement que `/` et `/404`.
- Un client tRPC est présent, mais `server/routers.ts` ne contient que `auth.me` et `auth.logout`.
- Le serveur Express/tRPC existe dans `server/_core/`, mais le projet Webdev est déclaré avec `features.server=false` et `features.database=false`.
- Drizzle est configuré sur MySQL-compatible (`drizzle-orm/mysql2`). Le schéma ne contient que `users` ; aucune table métier n’existe.
- Deux tests d’intégration de plateforme/authentification existent ; aucun test métier n’est présent.

## 2. Écarts confirmés dans le frontend

- `ReportForm` utilise des valeurs fixes : identifiant pseudo-aléatoire non garanti globalement, date fixe, coordonnées fixes, arrondissement fixe et historique fixe. Les médias, le GPS et le vocal sont des bascules d’interface et non des pièces jointes ou des données réelles.
- Les dépôts importés du GeoJSON sont transformés par `terrainReportsFromGeoJSON` en objets `Report` avec statut `En attente`. Cela mélange inventaire de dépôts et signalements citoyens et expose les dépôts importés aux transitions/récompenses.
- `updateReport` attribue 25 points dans le stockage local dès qu’un `Report` passe à `Validé`. Cette règle n’est pas configurable côté serveur et n’est pas protégée contre un contexte multi-utilisateur.
- Les statuts sont un simple champ modifiable par l’interface ; les transitions autorisées et les acteurs habilités ne sont pas contrôlés côté serveur.
- `ARRONDISSEMENTS` contient quatre valeurs codées en dur et ne reflète pas la couche administrative validée de dix entités.
- `Analysis` calcule principalement la part des dépôts par secteur. Les curseurs ne produisent pas encore une somme de critères normalisés explicable.
- La création d’intervention est encore un toast « simulé » ; les écrans de valorisation, tournées, points et collecteurs sont vides ou partiellement simulés.
- Les récompenses sont explicitement fictives, mais les comptes locaux affichés dans l’administration ne sont pas des utilisateurs authentifiés réels.

## 3. Données géographiques contrôlées

### Dépôts sauvages

`depots_sauvages_corrige.geojson` est une `FeatureCollection` de 188 `Point`, sans champ `crs` déclaré. Chaque coordonnée comporte trois valeurs ; les deux premières sont longitude/latitude plausibles : longitude 2.0342618–2.1008331, latitude 7.152838–7.249737. Les codes D001–D188 sont uniques dans l’audit effectué. Les noms source d’arrondissement sont : `BOHICON I`, `BOHICON II`, `OUASSAHO`, `AVOGBANNAN`, `AGONGONTO`, `SACLO`, `SODOHOME`, `LISSEZOUN`, `PASSAGON`, `GNIDJAZOUN`.

### Limites administratives

`Arrondissements_Bohicon.geojson` contient 10 `MultiPolygon` avec CRS déclaré `EPSG:32631` (UTM 31N). `Arrondissements_Bohicon_wgs84.geojson` contient les mêmes 10 entités, mêmes propriétés et même ordre, sans champ `crs` mais avec des coordonnées longitude/latitude. Les noms `BN_NIV4` de référence sont : `Saclo`, `1er Arrondissement-Bo`, `2er Arrondissement-Bo`, `Sodohom`, `Ouassaho`, `Agongointo`, `Gnidjazoun`, `LissCzoun`, `Avogbanna`, `Passagon`. Le champ `ID` vaut 12 pour les dix entités et ne peut donc pas servir seul d’identifiant unique.

### Rattachement spatial indépendant

Un contrôle point-polygone local avec les limites WGS84 indique :

- 188/188 dépôts couverts par une limite ; 0 hors emprise.
- 133/188 noms textuels source ne correspondent pas au nom `BN_NIV4` du polygone contenant le point, après comparaison insensible à la casse.
- Le nombre de 63 écarts indiqué dans l’ancien `plan.md` n’est pas reproduit par cette méthode ; il doit être considéré comme un résultat historique non confirmé, et remplacé par le rapport reproductible généré pendant la correction.
- Les écarts semblent relever principalement d’une nomenclature de sources différente et/ou d’un rattachement textuel historique, avec des cas de position dans un autre polygone. Ils ne doivent pas être corrigés silencieusement.
- Les propriétés des deux fichiers administratifs sont identiques ; la différence principale est le CRS et la transformation de coordonnées.

## 4. Backend, base et sécurité

- Le projet Webdev est actuellement `server=false`, `database=false`. L’infrastructure ne fournit donc pas encore de base partagée au runtime.
- Le socle existant utilise Manus OAuth et des procédures `protectedProcedure`/`adminProcedure`, mais les routes métier n’existent pas.
- La base gérée disponible dans cet environnement est MySQL-compatible, pas PostgreSQL/PostGIS. Les opérations spatiales doivent donc rester compatibles MySQL/client : coordonnées WGS84, calcul de distance documenté et rattachement polygonal préparé côté service, sans prétendre disposer de fonctions PostGIS.
- Aucun stockage de pièces jointes métier n’est branché.

## 5. Tests et vérifications exécutés

- Audit TypeScript du projet : disponible via `pnpm check`, à rejouer après chaque lot.
- Build statique déjà disponible via `pnpm build:static`.
- Tests existants : `server/platform.test.ts` et `server/auth.logout.test.ts`.
- Audit GeoJSON exécuté avec scripts Python locaux ; le contrôle géométrique a été refait sans dépendre d’une bibliothèque externe.
- Lint dédié, tests métier, tests d’intégration métier et migrations métier n’existent pas encore.

## 6. Risques et limites

1. L’activation de la base gérée est une capacité persistante et partagée entre développement et publication ; les migrations seront additives et testées sans suppression destructive.
2. L’authentification Manus fournit l’identité, mais les rôles métier doivent être ajoutés et contrôlés par les procédures serveur.
3. Le stockage local restera un mode de démonstration dégradé tant que le backend n’est pas connecté ; il ne sera pas présenté comme une base multi-utilisateur.
4. La couche OSM locale est une mosaïque d’affichage ; elle ne constitue pas un réseau routier ni une preuve de couverture de collecte.
