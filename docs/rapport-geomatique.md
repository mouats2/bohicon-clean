# BOHICON CLEAN — Rapport géomatique

## Sources et conservation

- `depots_sauvages_corrige.geojson` : source terrain reçue, 188 `Point`, codes D001–D188 uniques, coordonnées plausibles en longitude/latitude ; copie conservée strictement identique dans `client/public/data/`.
- `Arrondissements_Bohicon.geojson` : source administrative reçue, 10 `MultiPolygon`, CRS déclaré `EPSG:32631` (UTM 31N).
- `Arrondissements_Bohicon_wgs84.geojson` : version d’affichage reprojetée vers `EPSG:4326`; attributs et ordre des 10 entités conservés.
- `territorial-linkage.json` : rapport calculé et versionné ; les valeurs source ne sont pas écrasées.

## Contrôles

- Les 188 coordonnées terrain ont été contrôlées et sont couvertes par une limite administrative WGS84 : **188/188**, 0 hors emprise.
- Les limites contiennent 10 entités. Le champ source `ID` vaut 12 pour les dix et n’est donc pas un identifiant unique suffisant ; l’application utilise une clé locale rang + nom.
- Les rattachements spatiaux sont calculés par point-dans-polygone, en gérant `Polygon` et `MultiPolygon`, avec prise en compte des trous.
- Le champ textuel source d’arrondissement est conservé dans `arrondissementSource`; le rattachement géométrique est stocké séparément dans `arrondissementComputed`.

## Écarts

Le rapport contient `sourceNameMismatchCount: 63` et `spatialMatchedCount: 188`. Les 63 écarts ne sont pas supprimés ni corrigés automatiquement. Ils traduisent un écart entre nomenclatures source et noms `BN_NIV4`, avec notamment les variantes `BOHICON I/II`, `SODOHOME`, `AGONGONTO`, `AVOGBANNAN` et les graphies administratives `Agongointo`, `Sodohom`, `Avogbanna`, `LissCzoun`, `Gnidjazoun`. La méthode ne présente donc pas le nom textuel comme preuve spatiale ; l’utilisateur peut auditer chaque code dans `territorial-linkage.json`.

## MCA et limites

Le moteur applique, pour chaque secteur : `Sᵢ = Σ wⱼ Nᵢⱼ`, avec normalisation min-max, direction `maximize`/`minimize`, somme des poids strictement égale à 1, renormalisation documentée si une valeur est manquante et statut provisoire si un critère indispensable est indisponible. En l’absence de réseau routier, d’horaires et de points officiellement vérifiés, la proximité ne vaut pas couverture effective ; aucune distance routière ni capacité de service n’est inventée.
