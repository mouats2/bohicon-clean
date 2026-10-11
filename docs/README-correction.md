# BOHICON CLEAN — configuration après correction

## Lancer

```bash
pnpm install
pnpm db:migrate
pnpm db:seed-terrain
pnpm dev
```

Le serveur attend `DATABASE_URL`. L’authentification Manus fournit la session et le rôle legacy `admin`; le rôle métier est stocké dans `users.appRole` (`citizen`, `collector`, `agent`, `admin`). La règle de démonstration de récompense est versionnée `demo-v1`; sa valeur peut être ajustée côté serveur avec `BOHICON_SIGNALMENT_REWARD_POINTS` (25 par défaut).

## Données géographiques

- `client/public/data/depots_sauvages_corrige.geojson` est la source terrain originale, conservée sans modification.
- `client/public/data/Arrondissements_Bohicon.geojson` est la source administrative reçue.
- `client/public/data/Arrondissements_Bohicon_wgs84.geojson` est la version d’affichage reprojetée vers WGS84.
- Les 188 dépôts sont importés par `pnpm db:seed-terrain` dans `depots_sauvages`; le script est idempotent.
- Les écarts de rattachement sont documentés dans `client/public/data/territorial-linkage.json`.

## API métier

Les procédures tRPC sont groupées sous `signalements`, `deposits`, `interventions`, `collectors`, `collections` et `geoImports`. Les procédures sensibles utilisent une procédure protégée ou municipale. Les créations de signalement, changements de statut, interventions et pesées écrivent un historique. La validation du signalement crédite au plus une transaction de points grâce à l’identifiant unique de crédit.

## Limites explicites

- Les pièces jointes sont validées et prévisualisées côté navigateur; elles restent `local` tant qu’un stockage d’objets n’est pas connecté.
- La carte utilise OpenStreetMap local mis en cache pour l’emprise de Bohicon et affiche une attribution; aucune distance routière n’est annoncée.
- Les points de regroupement, collecteurs et routes restent absents tant qu’une source vérifiée n’est importée ou créée.
- Le module Intelligence expose des règles déterministes et des hypothèses; aucune IA externe n’est revendiquée.
- Le local-first reste disponible pour la démonstration, mais n’est pas une base partagée lorsqu’aucune session serveur n’est disponible.
