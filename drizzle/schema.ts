import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Utilisateur d’authentification Manus et rôle métier applicatif. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  appRole: mysqlEnum("appRole", ["public", "citizen", "collector", "agent", "admin"]).default("citizen").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const depotsSauvages = mysqlTable("depots_sauvages", {
  id: varchar("id", { length: 96 }).primaryKey(),
  sourceCode: varchar("sourceCode", { length: 96 }).notNull(),
  sourceLayer: varchar("sourceLayer", { length: 190 }).notNull(),
  sourceProperties: json("sourceProperties").notNull(),
  sourceDate: varchar("sourceDate", { length: 40 }),
  category: varchar("category", { length: 120 }).notNull(),
  severity: mysqlEnum("severity", ["Faible", "Moyenne", "Élevée"]).notNull(),
  priority: mysqlEnum("priority", ["Basse", "Moyenne", "Haute"]).notNull(),
  status: mysqlEnum("status", ["Recensé", "Confirmé", "À contrôler"]).default("Recensé").notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  lat: decimal("lat", { precision: 11, scale: 8 }).notNull(),
  lng: decimal("lng", { precision: 11, scale: 8 }).notNull(),
  arrondissementSource: varchar("arrondissementSource", { length: 190 }),
  arrondissementComputed: varchar("arrondissementComputed", { length: 190 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ sourceUnique: uniqueIndex("depots_sauvages_source_unique").on(table.sourceLayer, table.sourceCode), spatialLookup: index("depots_sauvages_spatial_idx").on(table.arrondissementComputed) }));
export type DepotSauvageRow = typeof depotsSauvages.$inferSelect;
export type InsertDepotSauvage = typeof depotsSauvages.$inferInsert;

export const signalements = mysqlTable("signalements", {
  id: varchar("id", { length: 96 }).primaryKey(),
  authorUserId: int("authorUserId"),
  status: mysqlEnum("status", ["En attente", "En cours de vérification", "Validé", "Rejeté", "Doublon", "Traité"]).default("En attente").notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  severity: mysqlEnum("severity", ["Faible", "Moyenne", "Élevée"]).notNull(),
  priority: mysqlEnum("priority", ["Basse", "Moyenne", "Haute"]).notNull(),
  description: text("description").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  lat: decimal("lat", { precision: 11, scale: 8 }).notNull(),
  lng: decimal("lng", { precision: 11, scale: 8 }).notNull(),
  arrondissementSource: varchar("arrondissementSource", { length: 190 }).notNull(),
  arrondissementComputed: varchar("arrondissementComputed", { length: 190 }),
  linkedDepotId: varchar("linkedDepotId", { length: 96 }),
  provenance: mysqlEnum("provenance", ["citizen", "municipal"]).default("citizen").notNull(),
  rewardCredited: boolean("rewardCredited").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ authorIdx: index("signalements_author_idx").on(table.authorUserId), statusIdx: index("signalements_status_idx").on(table.status), locationIdx: index("signalements_location_idx").on(table.arrondissementComputed) }));
export type SignalementRow = typeof signalements.$inferSelect;
export type InsertSignalement = typeof signalements.$inferInsert;

export const signalementAttachments = mysqlTable("signalement_attachments", {
  id: varchar("id", { length: 96 }).primaryKey(),
  signalementId: varchar("signalementId", { length: 96 }).notNull(),
  storageKey: varchar("storageKey", { length: 255 }),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  status: mysqlEnum("status", ["local", "uploaded", "failed"]).default("local").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ signalementIdx: index("attachments_signalement_idx").on(table.signalementId) }));

export const statusHistory = mysqlTable("status_history", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 60 }).notNull(),
  entityId: varchar("entityId", { length: 96 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 80 }),
  toStatus: varchar("toStatus", { length: 80 }).notNull(),
  actorUserId: int("actorUserId"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ entityIdx: index("status_history_entity_idx").on(table.entityType, table.entityId) }));

export const interventions = mysqlTable("interventions", {
  id: varchar("id", { length: 96 }).primaryKey(),
  siteId: varchar("siteId", { length: 96 }).notNull(),
  siteType: mysqlEnum("siteType", ["depot", "signalement"]).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  responsibleUserId: int("responsibleUserId"),
  priority: mysqlEnum("priority", ["Basse", "Moyenne", "Haute"]).notNull(),
  plannedDate: timestamp("plannedDate"),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  status: mysqlEnum("status", ["À planifier", "Planifiée", "En cours", "Terminée", "À contrôler"]).default("À planifier").notNull(),
  comment: text("comment"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ siteIdx: index("interventions_site_idx").on(table.siteId), statusIdx: index("interventions_status_idx").on(table.status) }));

export const collectors = mysqlTable("collectors", {
  id: varchar("id", { length: 96 }).primaryKey(),
  userId: int("userId").notNull(),
  zone: varchar("zone", { length: 190 }).notNull(),
  availability: varchar("availability", { length: 255 }),
  applicationStatus: mysqlEnum("applicationStatus", ["Brouillon", "Soumise", "En formation", "Autorisée", "Suspendue"]).default("Brouillon").notNull(),
  authorizedAt: timestamp("authorizedAt"),
  suspendedAt: timestamp("suspendedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userUnique: uniqueIndex("collectors_user_unique").on(table.userId) }));

export const trainingResults = mysqlTable("training_results", {
  id: int("id").autoincrement().primaryKey(),
  collectorId: varchar("collectorId", { length: 96 }).notNull(),
  score: int("score").notNull(),
  threshold: int("threshold").default(80).notNull(),
  passed: boolean("passed").notNull(),
  answers: json("answers").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, table => ({ collectorIdx: index("training_collector_idx").on(table.collectorId) }));

export const pointRegroupements = mysqlTable("point_regroupements", {
  id: varchar("id", { length: 96 }).primaryKey(),
  name: varchar("name", { length: 190 }).notNull(),
  location: varchar("location", { length: 255 }),
  lat: decimal("lat", { precision: 11, scale: 8 }).notNull(),
  lng: decimal("lng", { precision: 11, scale: 8 }).notNull(),
  acceptedCategories: json("acceptedCategories").notNull(),
  capacityKg: decimal("capacityKg", { precision: 12, scale: 2 }),
  operational: boolean("operational"),
  verified: boolean("verified").default(false).notNull(),
  provenance: mysqlEnum("provenance", ["terrain", "municipal", "calculated", "hypothesis"]).notNull(),
  hours: varchar("hours", { length: 190 }),
  responsibleUserId: int("responsibleUserId"),
  lastVerifiedAt: timestamp("lastVerifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const collections = mysqlTable("collections", {
  id: varchar("id", { length: 96 }).primaryKey(),
  collectorId: varchar("collectorId", { length: 96 }).notNull(),
  pointId: varchar("pointId", { length: 96 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  declaredKg: decimal("declaredKg", { precision: 12, scale: 2 }).notNull(),
  verifiedKg: decimal("verifiedKg", { precision: 12, scale: 2 }),
  validatedKg: decimal("validatedKg", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["Déclarée", "Vérifiée", "Validée"]).default("Déclarée").notNull(),
  paid: boolean("paid").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ collectorIdx: index("collections_collector_idx").on(table.collectorId), pointIdx: index("collections_point_idx").on(table.pointId) }));

export const weighingValidations = mysqlTable("weighing_validations", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: varchar("collectionId", { length: 96 }).notNull(),
  verifiedKg: decimal("verifiedKg", { precision: 12, scale: 2 }).notNull(),
  validatedKg: decimal("validatedKg", { precision: 12, scale: 2 }),
  validatedByUserId: int("validatedByUserId").notNull(),
  paidAmountFcfa: int("paidAmountFcfa"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ collectionUnique: uniqueIndex("weighing_collection_unique").on(table.collectionId) }));

export const pointTransactions = mysqlTable("point_transactions", {
  id: varchar("id", { length: 96 }).primaryKey(),
  userId: int("userId").notNull(),
  signalementId: varchar("signalementId", { length: 96 }),
  amount: int("amount").notNull(),
  kind: mysqlEnum("kind", ["credit", "debit"]).notNull(),
  ruleVersion: varchar("ruleVersion", { length: 40 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ uniqueCredit: uniqueIndex("point_credit_signalement_unique").on(table.signalementId, table.kind) }));

export const geoImports = mysqlTable("geo_imports", {
  id: varchar("id", { length: 96 }).primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  layerName: varchar("layerName", { length: 190 }).notNull(),
  sourceCrs: varchar("sourceCrs", { length: 80 }),
  displayCrs: varchar("displayCrs", { length: 80 }),
  featureCount: int("featureCount").notNull(),
  validCount: int("validCount").notNull(),
  warningCount: int("warningCount").notNull(),
  properties: json("properties").notNull(),
  sourceChecksum: varchar("sourceChecksum", { length: 128 }),
  importedByUserId: int("importedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const valorisationLots = mysqlTable("valorisation_lots", {
  id: varchar("id", { length: 96 }).primaryKey(),
  collectionId: varchar("collectionId", { length: 96 }).notNull(),
  pointId: varchar("pointId", { length: 96 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  incomingKg: decimal("incomingKg", { precision: 12, scale: 2 }).notNull(),
  outgoingKg: decimal("outgoingKg", { precision: 12, scale: 2 }),
  destination: varchar("destination", { length: 255 }),
  responsibleUserId: int("responsibleUserId"),
  status: mysqlEnum("status", ["Regroupé", "Trié", "Valorisé", "Traitement final"]).default("Regroupé").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
