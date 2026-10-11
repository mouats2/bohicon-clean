# BOHICON CLEAN — Plan de correction priorisé

## Décisions d’architecture

Conserver React/TypeScript, Express, tRPC, Drizzle et Leaflet. Introduire des modules métier ciblés sans réécrire toute l’application. Activer les capacités serveur et base gérée nécessaires aux mutations partagées ; la base disponible est MySQL-compatible, donc PostGIS n’est pas disponible dans cet environnement. Les calculs spatiaux seront documentés en WGS84, avec fonctions de rattachement côté service et distance haversine lorsque les données adaptées existent.

La persistance locale reste un mode de démonstration explicitement limité. Lorsqu’un backend est disponible, les opérations sensibles passeront par tRPC et l’UI ne revendiquera pas de succès serveur avant confirmation.

## Phase A — Fiabilité des données

1. **Séparer les entités métier** dans `client/src/lib/demo.ts` et des modules partagés : `DepotSauvage`, `Signalement`, `Intervention`, `Collecte`, `PointRegroupement`, avec provenance, géométrie, pièces jointes et historique adaptés.
2. **Charger les 188 dépôts comme `DepotSauvage`** et non comme signalements en attente. Ils ne génèrent aucun point citoyen.
3. **Brancher le formulaire citoyen** : sélection réelle de médias avec validation MIME/taille, aperçu/suppression/remplacement ; géolocalisation navigateur avec erreurs et position manuelle ; validation des champs ; identifiant UUID/crypto ; date ISO générée à l’enregistrement ; rattachement d’arrondissement conservant source/calcul.
4. **Référentiel administratif dynamique** : extraire les dix noms `BN_NIV4` de la couche WGS84, conserver l’ID source non unique et créer une clé locale stable composée du rang/nom. Produire un rapport de rattachement reproductible et ne pas écraser les attributs source.
5. **Analyse multicritère explicable** : densité disponible, couverture/distances marquées indisponibles en l’absence de points officiels et réseau ; normalisation min-max documentée, direction de chaque critère, poids validés et score provisoire si critère indispensable manquant.
6. Ajouter les tests unitaires de validation de média, coordonnées, identifiant, séparation métier et score.

## Phase B — Socle serveur sécurisé

1. Activer `features.server=true` et `features.database=true` ; la base gérée sera MySQL-compatible.
2. Étendre Drizzle avec tables additives : rôles/utilisateurs métier, dépôts, signalements, pièces jointes, événements de statut, interventions, candidatures/formation, points de regroupement, collectes, pesées, transactions de points, flux de valorisation, importations géographiques.
3. Ajouter les index/uniqueness nécessaires et une migration versionnée. Ne supprimer aucune donnée existante.
4. Ajouter des procédures tRPC protégées : création/consultation des signalements, transitions autorisées, doublons, interventions, collectes/pesées, points, import GeoJSON et récompenses.
5. Ajouter les garde-fous serveur : citoyen limité à ses signalements, validation indépendante, collecteur non autorisé bloqué, admin réservé aux utilisateurs habilités, transaction atomique pour statut + points, idempotence par clé unique.
6. Ajouter tests de procédures et d’autorisations avec contexte utilisateur contrôlé.

## Phase C — Opérations terrain

1. Remplacer le toast « Nouvelle intervention » par un formulaire réellement persisté, avec transition `À planifier → Planifiée → En cours → Terminée → À contrôler` et historique.
2. Compléter candidature/formation/quiz collecteur ; seuil configurable, score calculé à partir des réponses, date et état conservés.
3. Implémenter le circuit collecte : déclaré, pesé, validé, paiement idempotent ; distinguer les trois quantités.
4. Implémenter les points de regroupement avec provenance, statut opérationnel, capacité et dernière vérification.
5. Implémenter les lots de valorisation sans double comptage entre collecte, tri, valorisation et traitement final.

## Phase D — Intelligence territoriale

1. Distinguer règles déterministes, statistiques, calculs spatiaux et IA non configurée.
2. Produire des recommandations datées et explicables à partir des seules données disponibles.
3. Ajouter une simulation de tournées avec distances à vol d’oiseau clairement étiquetées ; ne pas annoncer de distance routière sans réseau/moteur.
4. Ajouter exports CSV/GeoJSON opérationnels sur le périmètre filtré ; PDF seulement si une chaîne fiable est disponible.

## Phase E — Stabilisation

1. Refactoriser progressivement les modules les plus sensibles hors de `Home.tsx`.
2. Harmoniser Leaflet comme stratégie principale ; conserver `Map.tsx` Google Maps uniquement comme composant non utilisé/documenté tant qu’aucune exigence ne l’active.
3. Ajouter messages d’erreur utilisateur + détails techniques non sensibles, relance d’import et logs.
4. Exécuter TypeScript, tests Vitest, build statique et, après activation, migration/serveur et tests de parcours.
5. Documenter les limites OSM, l’absence de PostGIS, les données manquantes et la procédure de démonstration.

## Dépendances et risques

- La Phase B dépend de l’activation serveur/base et du schéma ; les procédures UI peuvent garder un fallback local avant connexion.
- Les distances de couverture et tournées sont bloquées scientifiquement sans points officiels, réseau routier, horaires et fréquences.
- Le stockage des médias réels dépend du service de stockage ; la sélection locale et le statut « non téléversé » peuvent fonctionner sans ce service.
- Toute mutation de base doit être testée comme donnée partagée ; aucune réinitialisation destructive ne sera exécutée.
