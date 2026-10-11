# BOHICON CLEAN — Bilan final

| Correction / livrable | Statut | Preuve ou limite |
|---|---|---|
| Diagnostic initial | Terminée et vérifiée | `docs/diagnostic-initial.md` |
| Plan priorisé | Terminée et vérifiée | `docs/plan-correction.md` |
| Séparation DepotSauvage / Signalement / Intervention / Collecte / PointRegroupement | Terminée et vérifiée | Types explicites dans `client/src/lib/demo.ts`, tables Drizzle dédiées |
| 188 dépôts terrain non récompensables | Terminée et vérifiée | GeoJSON original conservé, seed SQL vérifié à 188 lignes |
| Médias | Partiellement terminée | Sélection, MIME/taille, aperçu, suppression et statut `local` opérationnels ; Storage serveur à connecter |
| GPS réel et correction manuelle | Terminée côté navigateur | API Geolocation, refus/timeout et marqueur Leaflet déplaçable ; test terminal réel restant |
| Dates/coordonnées/identifiants du signalement | Terminée et vérifiée | UUID/crypto et date ISO à la création ; champs obligatoires contrôlés |
| Rattachement administratif | Terminée et vérifiée | 10 entités source, reprojection WGS84, 188/188 couverts, 63 écarts conservés dans le rapport |
| MCA explicable | Terminée et vérifiée | Normalisation, directions, validation des poids, manquants et tests unitaires |
| Tables métier et migration | Terminée et vérifiée | `drizzle/0001_brainy_unus.sql`, `pnpm db:push` réussi |
| Routes tRPC métier et rôles | Partiellement terminée | Procédures protégées et municipales, transactions et idempotence ; intégration multi-utilisateur à approfondir |
| Récompenses | Partiellement terminée | Crédit unique transactionnel, règle `demo-v1` configurable par `BOHICON_SIGNALMENT_REWARD_POINTS`; stockage des récompenses réelles non connecté |
| Interventions | Terminée côté prototype | Formulaire, identifiant, site, priorité, date, commentaire, statut initial et historique local + mutation tRPC |
| Collecteurs / formation | Partiellement terminée | Quiz calculé avec seuil 80 % et circuit serveur ; candidature/autorisation UI complète à poursuivre |
| Collectes / pesées | Partiellement terminée | Tables, séparation déclaré-vérifié-validé et verrou anti-double validation ; UI de validation municipale à compléter |
| Points de regroupement | Partiellement terminée | Schéma et garde-fous présents ; aucune infrastructure officielle n’est inventée ou préremplie |
| Valorisation | Partiellement terminée | Table de lots et statuts de chaîne présents ; écrans/exports de valorisation à compléter |
| Intelligence / recommandations | Partiellement terminée | Règles et hypothèses séparées ; aucun service IA externe revendiqué |
| Carte OSM | Terminée et vérifiée | Leaflet + mosaïque OSM locale, attribution, couches terrain ; pas de réseau routier |
| Tests | Terminée et vérifiée | 13 tests Vitest, check TypeScript, build et contrôles HTTP exécutés |
| Documentation | Terminée et vérifiée | `docs/README-correction.md`, rapport tests et rapport géomatique |

## Blocages restant avant production

1. Connecter un stockage objet et une validation serveur des pièces jointes.
2. Ajouter les tests d’intégration avec sessions authentifiées distinctes et contrôles d’accès exécutés contre la base.
3. Importer ou créer des points de regroupement officiels, collecteurs autorisés et réseau routier avant toute analyse de couverture/tournée.
4. Refactoriser progressivement `Home.tsx` et compléter les écrans de valorisation, exports et rapports.
