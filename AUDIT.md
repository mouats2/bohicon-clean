# Audit de la plateforme BOHICON CLEAN

**Projet audité :** `mouats2/bohicon-clean`  
**Date :** 12 octobre 2026  
**Périmètre :** archive fournie `bohicon-clean-main.zip`, analyse statique, qualité des données, build/tests et smoke test HTTP.

## Synthèse

BOHICON CLEAN est aujourd’hui un **prototype front-end local-first** bien avancé visuellement, avec une bonne transparence sur ce qui est simulé. La structure React/TypeScript est lisible, le domaine métier est déjà modélisé et les contrôles de base passent.

En revanche, la plateforme n’est pas encore prête pour un usage réel mairie/citoyens/collecteurs :

1. **les rôles et les actions sensibles sont simulés côté client** ;
2. **les données métier sont uniquement dans `localStorage`**, sans synchronisation ni contrôle serveur ;
3. **les fichiers GeoJSON sont servis publiquement** et exposent des métadonnées internes de collecte ;
4. **les modules métier serveur et les tables de domaine n’existent pas encore** ;
5. le bundle et les dépendances doivent être durcis avant mise en ligne.

## Résultats des vérifications

| Contrôle | Résultat |
|---|---:|
| `pnpm check` | Réussi |
| `pnpm test` | Réussi : 2 fichiers, 6 tests |
| `pnpm build` | Réussi, avec avertissements |
| Serveur production `/api/health` | `200 OK` |
| Données dépôts sauvages | 188 `Point` valides |
| Limites administratives | 10 `MultiPolygon`, source EPSG:32631, affichage EPSG:4326 |
| Rattachement spatial | 188/188 dépôts dans une limite |
| Écarts de nom source / rattachement spatial | 63 |
| `pnpm audit --prod` | 92 vulnérabilités signalées : 23 hautes, 2 critiques, 55 modérées, 12 faibles |
| Bundle JS principal | ~1,09 Mo minifié, ~306 Ko gzip |

> Le résultat de `pnpm audit` doit être retraité après mise à jour du lockfile pour distinguer les vulnérabilités réellement exploitables et les dépendances transitives, mais il doit être traité comme un blocage avant production.

## Priorités immédiates

### P0 — À corriger avant toute ouverture au public

#### 1. Protéger réellement les rôles et les actions sensibles

**Constat :** le sélecteur `role` de `client/src/pages/Home.tsx` permet de passer librement entre Citoyen, Collecteur, Mairie et Administration. L’import GeoJSON, le reset, la validation des dépôts et les vues mairie ne sont pas protégés par une session ni par une autorisation serveur.

**Risque :** n’importe quel utilisateur peut afficher l’administration, modifier les statuts, créditer des points dans son navigateur ou effacer son état local. En mode local c’est acceptable pour une démo, mais pas pour une plateforme civique réelle.

**À faire :**
- remplacer le sélecteur de rôles par le rôle renvoyé par le compte authentifié ;
- protéger chaque mutation par `protectedProcedure`/`adminProcedure` côté serveur ;
- vérifier côté serveur la propriété d’un signalement et les transitions autorisées ;
- ajouter une matrice de permissions : citoyen, collecteur, agent mairie, administrateur ;
- journaliser acteur, date, ancienne valeur, nouvelle valeur et justification.

#### 2. Retirer les métadonnées internes du GeoJSON public

**Constat :** `client/public/data/depots_sauvages_corrige.geojson` est directement téléchargeable et contient notamment `_submitted_by`, `_uuid`, `meta/rootUuid`, `_id`, les coordonnées exactes et des attributs de collecte.

**Risque :** exposition inutile d’identifiants internes, du compte de saisie et de la localisation précise de dépôts. Les fichiers placés dans `client/public` sont publics par conception.

**À faire :**
- publier une version nettoyée : supprimer `_submitted_by`, `_uuid`, `meta/rootUuid`, `_id`, champs techniques et toute information non nécessaire à l’interface ;
- conserver l’original dans un stockage privé avec contrôle d’accès ;
- décider si la précision GPS doit être réduite pour la vue citoyenne ;
- documenter la base légale, la durée de conservation et les règles d’accès ;
- ajouter un test qui interdit l’export de champs internes.

#### 3. Construire le backend métier avant de parler de déploiement réel

**Constat :** `server/routers.ts` ne contient que `auth.me` et `auth.logout`; `drizzle/schema.ts` ne contient que `users`. Les signalements, interventions, collectes, paiements simulés, historiques et couches sont stockés dans `localStorage`.

**Risque :** aucune donnée partagée entre utilisateurs/appareils, aucune sauvegarde fiable, aucune transaction, aucun anti-double-crédit côté serveur et aucune continuité de service.

**À faire :** créer au minimum les tables `reports`, `report_events`, `interventions`, `collectors`, `collections`, `collection_verifications`, `wallet_ledger`, `geo_layers` et `audit_events`, puis exposer des procédures tRPC validées par Zod et transactionnelles.

### P1 — À corriger avant pilote mairie

#### 4. Corriger la logique de réinitialisation et l’initialisation terrain

`reset()` remplace l’état par `createInitialState()`, mais les deux chargements GeoJSON sont dans des `useEffect(..., [])` et ne se relancent pas après le reset. La promesse affichée de « retrouver l’état initial » est donc ambiguë : après reset, les 188 dépôts et les limites disparaissent jusqu’au rechargement de la page.

**Recommandation :** définir clairement « reset de la démo » et « recharger les données terrain », ou conserver les couches terrain immuables séparément des mutations utilisateur. Ajouter un test d’intégration reset → état attendu.

#### 5. Corriger la qualité territoriale avant d’utiliser les arrondissements dans les décisions

Le contrôle indique 188 dépôts dans une limite, mais **63 écarts** entre l’arrondissement textuel source et l’arrondissement spatial. L’interface utilise encore la valeur source dans `terrainReportsFromGeoJSON` et affiche des filtres par arrondissement, sans distinguer assez clairement « valeur déclarée » et « rattachement spatial calculé ».

**Recommandation :** conserver deux champs distincts (`arrondissementSource`, `arrondissementSpatial`), afficher l’écart comme anomalie de qualité et ne pas agréger les indicateurs sans préciser lequel est utilisé.

#### 6. Rendre les transitions métier réellement cohérentes

Plusieurs actions sont seulement des notifications : « créer une intervention », « voir la fiche », export de rapport et certaines fonctions mairie ne créent/modifient pas d’objet. Le quiz inverse également des boutons booléens mais ne stocke pas de bonnes/mauvaises réponses : le score mesure le nombre de boutons activés, pas la réussite à un quiz.

**Recommandation :** soit assumer partout le libellé « simulation », soit implémenter les mutations minimales et leurs validations. Pour le quiz, stocker les réponses correctes, le résultat, la date, le nombre d’essais et le seuil de 80 %.

#### 7. Renforcer la validation des entrées

Le formulaire local accepte des valeurs qui devront être rejetées côté serveur : quantités négatives ou non finies, catégories arbitraires, dates libres, coordonnées non validées et transitions de statut arbitraires. L’import GeoJSON utilise plusieurs `any` et une validation structurelle limitée.

**Recommandation :** schémas Zod partagés client/serveur, limites de taille et de nombre d’entités, validation stricte des coordonnées, détection de doublons d’identifiant, gestion des `GeometryCollection` si nécessaire, et rejet explicite des fichiers trop volumineux.

#### 8. Corriger le build et la performance front-end

Le build affiche : `script ... can't be bundled without type="module" attribute`. Le script `/api/platform/config.js` est pourtant un script classique qui expose une variable globale.

Le bundle JS principal pèse environ 1,09 Mo minifié, notamment parce que `Home.tsx` regroupe de nombreux parcours et dépendances graphiques.

**À faire :**
- ajouter explicitement `type="module"` seulement si le script est réellement converti en module, sinon configurer Vite pour éviter l’avertissement ;
- charger les espaces citoyen/collecteur/mairie/admin avec `import()` ;
- charger les graphiques et la carte à la demande ;
- mesurer les Core Web Vitals sur mobile ;
- compresser/servir les assets avec cache immutable et éventuellement WebP/AVIF pour la mosaïque.

#### 9. Traiter les dépendances vulnérables et inutilisées

`pnpm audit --prod` signale 92 vulnérabilités, dont 2 critiques et 23 hautes dans l’environnement audité. `axios` est déclaré mais aucune utilisation applicative n’a été trouvée dans le code source ; il doit être supprimé ou mis à jour avec son lockfile. Les dépendances doivent être traitées par groupes, avec tests et revue des breaking changes.

**À faire :**
- produire un SBOM et une liste des chemins concernés ;
- supprimer les paquets inutilisés ;
- mettre à jour en priorité les paquets impliqués dans les alertes critiques/hautes ;
- ajouter `pnpm audit --prod` à la CI avec seuil explicite ;
- verrouiller la version Node/pnpm de CI comme dans le Dockerfile.

### P2 — Qualité, exploitation et expérience

#### 10. Ajouter une vraie stratégie de tests

La couverture actuelle est limitée à deux tests serveur d’authentification. Il manque des tests sur les règles centrales : crédit unique après validation, double paiement, transitions, import/reprojection, détection d’écarts territoriaux, reset, permissions et persistance.

**Suite recommandée :**
- tests unitaires de `demo.ts` et `geojson.ts` ;
- tests de procédures tRPC avec utilisateur/citoyen/agent/admin ;
- tests de parcours navigateur mobile et desktop ;
- test de non-régression sur les 188 entités et les 63 écarts ;
- test de démarrage Docker avec healthcheck.

#### 11. Renforcer sécurité HTTP et observabilité

Le smoke test `/api/health` fonctionne, mais la réponse expose `X-Powered-By: Express` et aucun durcissement HTTP n’est visible dans l’entrée serveur. Il manque notamment une politique de sécurité, rate limiting et une gestion structurée des erreurs.

**Recommandations :**
- `helmet` ou équivalent configuré avec CSP adaptée aux cartes ;
- suppression de `X-Powered-By` ;
- rate limiting sur OAuth, import et mutations ;
- limites body distinctes et plus strictes par route ;
- logs JSON avec correlation ID, sans données personnelles ;
- endpoint de readiness séparé de liveness, avec statut DB/migrations.

#### 12. Améliorer accessibilité et cohérence UI

La page possède `lang="fr"`, mais plusieurs contrôles générés ont peu ou pas de libellé accessible : boutons d’icônes, toggles du quiz, graphiques et actions secondaires. La navigation clavier, les messages d’erreur et les contrastes doivent être testés avec axe/Lighthouse.

Les composants `DashboardLayout` et `ComponentShowcase` semblent issus du starter et ne correspondent pas au shell principal : les supprimer ou les isoler pour réduire la dette et le bundle.

#### 13. Documenter le contrat produit

Le `TODO.md` montre encore de nombreux critères non réalisés alors que l’interface présente plusieurs écrans. Il faut distinguer explicitement :
- prototype démontrable ;
- pilote local avec données réelles ;
- version connectée multi-utilisateur ;
- version avec paiement, GPS, photo et IA.

Chaque écran devrait afficher un statut de capacité cohérent et chaque action simulée devrait avoir un libellé uniforme.

## Ordre de travail conseillé

### Sprint 1 — sécurisation et vérité des données

1. Nettoyer les GeoJSON publics et déplacer les originaux en privé.
2. Bloquer les rôles côté serveur et supprimer le faux accès admin côté client.
3. Corriger reset/initialisation terrain.
4. Formaliser les deux arrondissements : source vs spatial.
5. Supprimer `axios` inutilisé et traiter les alertes de sécurité prioritaires.

### Sprint 2 — backend minimal métier

1. Ajouter schéma et migrations des signalements/événements/interventions.
2. Ajouter procédures tRPC avec Zod et transactions.
3. Migrer points, ledger et collectes hors de `localStorage`.
4. Ajouter audit log et idempotence pour validation/crédit/paiement.

### Sprint 3 — fiabilité produit

1. Ajouter les tests métier et E2E.
2. Implémenter les actions encore simulées ou les renommer clairement.
3. Découper le bundle et optimiser mobile.
4. Ajouter sécurité HTTP, rate limiting, logs et healthchecks.
5. Faire une recette avec agents mairie et collecteurs sur données anonymisées.

## Conclusion

**Avis global : prototype prometteur, non prêt pour production.**

La priorité n’est pas d’ajouter de nouvelles vues : elle est de transformer les fonctions déjà montrées en opérations vérifiables, autorisées et persistées côté serveur, tout en nettoyant les données publiées. Une fois ces P0/P1 traités, la base React/TypeScript pourra servir de bon socle pour un pilote mairie.


## Corrections appliquées dans cette itération

- Couche publique remplacée par `depots_sauvages_public.geojson` : métadonnées techniques supprimées et coordonnées arrondies à 4 décimales ; la source brute est conservée hors du répertoire public.
- Palette de marque intégrée dans les tokens CSS : `#0D9514`, `#013E3F`, `#FEFC90`, `#D0A57F`, `#00A3FC`, `#4EBE03`, `#FE5F00` et `#FFFFFF`.
- Design system UX/UI Pro Max persisté dans `design-system/bohicon-clean/MASTER.md` avec style Accessible & Ethical, density dashboard, motion subtile et règles responsive.
- Ajout d’un skip-link, de libellés ARIA sur les boutons d’icône, de focus visibles, de cibles tactiles minimales et de la prise en charge `prefers-reduced-motion`.
- Suppression du blocage de zoom mobile (`maximum-scale=5`).
- Page principale chargée en lazy loading : le bundle initial passe d’environ 1,09 Mo à environ 379 Ko minifiés ; la page Home reste un chunk séparé.
- Reset local corrigé : confirmation utilisateur, suppression de l’état local et rechargement des couches terrain.
- Limites des parseurs JSON serveur réduites de 50 Mo à 1 Mo ; ajout des en-têtes `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` et suppression de `X-Powered-By`.
- Axios mis à jour de 1.12.2 à 1.20.0.
- Build, typecheck, tests et smoke test HTTP repassés avec succès.

## Limites restantes explicitement non masquées

Le backend métier, les tables de signalements/interventions/collectes, les permissions serveur et la synchronisation multi-utilisateur restent à implémenter : les rôles affichés dans l’interface demeurent des rôles de démonstration locale. Après mise à jour Axios, `pnpm audit --prod --audit-level=high` signale encore **58 alertes** (11 hautes, 2 critiques) dans d’autres dépendances transitives/directes ; elles nécessitent une campagne de mises à jour séparée et des tests de compatibilité, notamment autour de Drizzle, MySQL2 et nanoid.
