# BOHICON CLEAN — Rapport de tests

Date du contrôle : 11 octobre 2026.

## Vérifications exécutées

| Commande | Résultat | Portée |
|---|---|---|
| `pnpm check` | Réussi | TypeScript client, serveur, schéma et tests |
| `pnpm test` | **13 tests réussis**, 5 fichiers | Auth/logout, plateforme, transitions de statut, média, MCA |
| `pnpm build` | Réussi | Bundle Vite + bundle Express/tRPC |
| `pnpm db:push` | Réussi | Génération et application de la migration `drizzle/0001_brainy_unus.sql` |
| `pnpm db:seed-terrain` | Réussi | 188 entités terrain traitées, import idempotent |
| Requête SQL `select count(*) from depots_sauvages` | `188` | Vérification de persistance en base |
| `curl /` | HTTP 200 | Serveur de développement |
| `curl /manus-routes.json` | HTTP 200, JSON valide | Manifeste de routes |
| `curl /data/depots_sauvages_corrige.geojson` + `cmp` | HTTP 200, source identique | Traçabilité de la donnée terrain |
| `curl GET /api/trpc/auth.me` | HTTP 200, `null` sans session | Procédure publique tRPC |

Le build signale seulement l’avertissement Vite habituel sur le script de configuration plateforme sans attribut `type=module`, ainsi qu’un avertissement de taille de chunk ; aucun échec de compilation n’est présent.

## Couverture métier automatisée

- Validation des types MIME, taille maximale et fichiers vides pour les médias.
- Normalisation min-max, direction maximiser/minimiser, somme des poids et données manquantes de la MCA.
- Transitions de signalement et états terminaux.
- Authentification plateforme, cookies de session et logout.

## Vérifications non automatisées ou partielles

- Le navigateur et l’appareil photo/GPS doivent encore être testés sur un terminal mobile réel avec autorisation utilisateur.
- Le téléversement durable des pièces jointes n’est pas testé : les fichiers restent explicitement `local` tant que Storage n’est pas connecté.
- Les routes métier protégées sont compilées et structurées, mais un scénario d’intégration avec plusieurs utilisateurs authentifiés doit être ajouté avant production.
- Aucun test de routage routier n’est possible : aucune donnée réseau ni moteur de routage n’est disponible.
