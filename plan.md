# Plan d’implémentation — BOHICON CLEAN

## Périmètre

Prototype web démontrable, local-first, sans backend ni base de données activés. Les données métier de démonstration sont clairement séparées des futurs GeoJSON de terrain. Les mutations importantes sont persistées dans `localStorage`, avec reset de la démonstration.

## Architecture

- `client/src/pages/Home.tsx` : shell applicatif et vues Public, Citoyen, Collecteur, Mairie, Administration.
- `client/src/lib/demo.ts` : types métier, jeux de données fictifs, persistance et transitions communes.
- `client/src/lib/geojson.ts` : validation GeoJSON, inspection des propriétés, détection d’anomalies et projection de prévisualisation.
- `client/src/index.css` : identité visuelle, responsive mobile-first, cartes, tableaux, états et animations.
- `public/manus-routes.json` : manifeste de routes de la SPA.
- `plan.md` / `TODO.md` : décisions et critères de couverture.

Le modèle prépare une migration ultérieure vers API + PostgreSQL/PostGIS : les entités ont des identifiants, des statuts, des historiques et une provenance (`demo` ou `terrain`). Les coordonnées importées ne sont pas réécrites silencieusement.

## Design

- **Mouvement** : civic-tech tropicale, inspirée des interfaces de services publics modernes et de la signalétique urbaine béninoise.
- **Principes** : lisibilité terrain, confiance institutionnelle, action immédiate, preuve et traçabilité.
- **Couleurs** : vert forêt (`#0E4F3C`) pour l’identité et l’action collective, sable clair pour les surfaces, citron doux (`#D6E86A`) pour les accents, ambre pour les alertes modérées et corail uniquement pour le critique.
- **Paradi​gme de mise en page** : une colonne de navigation stable et des panneaux éditoriaux asymétriques, avec les cartes et indicateurs comme surfaces de décision plutôt que comme grille SaaS uniforme.
- **Signatures** : marque-point circulaire, ruban de statut, cartes quadrillées façon plan de quartier.
- **Interactions** : chaque clic produit une conséquence visible dans les données liées ; les actions irréversibles restent simulées et expliquées.
- **Animation** : transitions courtes, apparition douce des panneaux, micro-mouvements uniquement sur les indicateurs et marqueurs.
- **Typographie** : `DM Sans` pour l’interface et `Space Grotesk` pour les chiffres et titres courts ; fallback système pour fonctionner sans connexion réseau.
- **Essence** : « le poste de commande citoyen et municipal de la propreté à Bohicon » — fiable, concret, collectif.
- **Voix** : claire, locale, sans jargon inutile. Exemples : « Un signalement documenté devient une action mesurable. » / « Voir le terrain. Décider juste. »
- **Logo** : mot-symbole BOHICON CLEAN accompagné d’un point-route formé de trois feuilles ; dans le prototype, le signe est rendu en SVG pour rester net sur mobile.
- **Couleur propriétaire** : vert forêt Bohicon `#0E4F3C`.

## Flux fonctionnels

1. Public → choix d’un espace de démonstration.
2. Citoyen → signalement progressif → validation mairie → points sans double-crédit.
3. Collecteur → formation/quiz → collecte → pesée déclarée/vérifiée/validée → gain sans double-paiement.
4. Mairie → carte, dépôts, interventions, priorités, valorisation, recommandations.
5. Administration → import GeoJSON, traçabilité, comptes de démonstration, reset.

## Limites explicites

- GPS, photo, vidéo, vocal, IA réelle, cartographie routière et synchronisation serveur sont affichés comme simulés ou non configurés lorsqu’ils ne sont pas réellement disponibles.
- La carte est une projection SVG de démonstration : elle accepte les entités GeoJSON importées et les données locales, mais ne prétend pas être un fond cartographique officiel.
- Les statistiques de démonstration sont étiquetées ; les résultats issus des fichiers importés conserveront leur provenance.

## Donnée terrain reçue — dépôts sauvages

Le fichier `client/public/data/depots_sauvages_corrige.geojson` est une copie binaire du fichier fourni par l’utilisateur. L’audit du 10 octobre 2026 indique une `FeatureCollection` de **188 entités**, toutes de géométrie `Point`, avec des coordonnées longitude/latitude plausibles et une troisième valeur d’altitude. Les codes observés restent des attributs source, sans réécriture ; les 188 codes sont uniques. Les champs de caractérisation comprennent notamment le quartier, l’arrondissement, le type de dépôt, le volume estimé, la nature des déchets, les proximités, l’accessibilité, l’état et les nuisances.

À l’exécution, la couche est chargée automatiquement comme provenance `terrain`. Les fiches normalisées affichées dans les listes sont des **résultats calculés** : elles reprennent le code, le quartier, l’arrondissement, les coordonnées et les attributs descriptifs, sans remplacer la couche originale. Le rattachement aux limites est documenté dans la section administrative ci-dessous et ne réécrit pas l’attribut textuel source.

## Couche administrative reçue — arrondissements

Le fichier `client/public/data/Arrondissements_Bohicon.geojson` est conservé à l’identique. Il contient **10 MultiPolygon** en **EPSG:32631 / UTM zone 31N**. Pour la projection de la carte, `Arrondissements_Bohicon_wgs84.geojson` est généré en **EPSG:4326**, avec la mention `sourceCrs`/`displayCrs` et sans remplacer la source. Les 10 limites sont visibles comme couche administrative indépendante.

Le contrôle spatial place les **188 dépôts dans une limite**. Il relève **63 écarts** entre l’arrondissement textuel déclaré dans la fiche de dépôt et l’arrondissement déterminé par le polygone. Ces écarts sont conservés comme qualité de donnée à examiner : l’application ne réécrit pas silencieusement l’attribut source.

## Fond cartographique

La carte opérationnelle utilise Leaflet avec un fond OpenStreetMap France. Pour éviter le rendu déformé de l’ancienne image overlay, l’emprise locale est désormais découpée en tuiles raster standard 256×256 sous `client/public/data/osm/13/{x}/{y}.png`; Leaflet gère ainsi correctement le placement, le zoom et le déplacement, avec attribution OpenStreetMap. Les polygones SVG et les marqueurs fictifs ont été retirés. L’état initial et l’ancien stockage de démonstration ont été purgés : seules les couches terrain reçues, les saisies utilisateur et les résultats calculés sont conservés.
