import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "./_core/env";
import { DEFAULT_SIGNALMENT_REWARD_POINTS, SIGNALMENT_REWARD_RULE_VERSION } from "../shared/rules";
import { SIGNALMENT_STATUS_TRANSITIONS } from "../shared/status";
import {
  depotsSauvages,
  geoImports,
  InsertSignalement,
  interventions,
  pointTransactions,
  signalementAttachments,
  signalements,
  statusHistory,
  users,
  weighingValidations,
  collections,
  collectors,
  valorisationLots,
  InsertUser,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try { _db = drizzle(ENV.databaseUrl); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; values.appRole = "admin"; updateSet.appRole = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

const signalmentRewardPoints = Number(process.env.BOHICON_SIGNALMENT_REWARD_POINTS ?? DEFAULT_SIGNALMENT_REWARD_POINTS);

export const SIGNALMENT_TRANSITIONS = SIGNALMENT_STATUS_TRANSITIONS;

export async function createSignalement(input: InsertSignalement, attachments: Array<{ id: string; originalName: string; mimeType: string; sizeBytes: number; storageKey?: string; status?: "local" | "uploaded" | "failed" }>) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    await tx.insert(signalements).values(input);
    if (attachments.length) await tx.insert(signalementAttachments).values(attachments.map(file => ({ ...file, signalementId: input.id, status: file.status ?? "local" })));
    await tx.insert(statusHistory).values({ entityType: "signalement", entityId: input.id, toStatus: "En attente", actorUserId: input.authorUserId ?? null, note: "Création du signalement" });
    return input.id;
  });
}

export async function listSignalements(authorUserId?: number) {
  const db = await getDb(); if (!db) return [];
  return authorUserId ? db.select().from(signalements).where(eq(signalements.authorUserId, authorUserId)).orderBy(desc(signalements.createdAt)) : db.select().from(signalements).orderBy(desc(signalements.createdAt));
}

export async function getSignalement(id: string) {
  const db = await getDb(); if (!db) return undefined;
  return (await db.select().from(signalements).where(eq(signalements.id, id)).limit(1))[0];
}

export async function listDepots() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(depotsSauvages).orderBy(desc(depotsSauvages.createdAt));
}

export async function updateSignalementStatus(id: string, nextStatus: string, actorUserId: number, note?: string) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const current = (await tx.select().from(signalements).where(eq(signalements.id, id)).limit(1))[0];
    if (!current) throw new Error("Signalement introuvable");
    if (!SIGNALMENT_TRANSITIONS[current.status]?.includes(nextStatus)) throw new Error(`Transition interdite : ${current.status} → ${nextStatus}`);
    await tx.update(signalements).set({ status: nextStatus as typeof signalements.$inferInsert.status, rewardCredited: nextStatus === "Validé" ? current.rewardCredited : current.rewardCredited }).where(eq(signalements.id, id));
    await tx.insert(statusHistory).values({ entityType: "signalement", entityId: id, fromStatus: current.status, toStatus: nextStatus, actorUserId, note: note ?? "Mise à jour de statut" });
    let rewardCredited = current.rewardCredited;
    if (nextStatus === "Validé" && !current.rewardCredited && current.authorUserId) {
      await tx.insert(pointTransactions).values({ id: `PT-${id}`, userId: current.authorUserId, signalementId: id, amount: signalmentRewardPoints, kind: "credit", ruleVersion: SIGNALMENT_REWARD_RULE_VERSION });
      await tx.update(signalements).set({ rewardCredited: true }).where(eq(signalements.id, id));
      rewardCredited = true;
    }
    return { ...current, status: nextStatus, rewardCredited };
  });
}

export async function createIntervention(input: typeof interventions.$inferInsert, actorUserId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    await tx.insert(interventions).values({ ...input, createdByUserId: actorUserId });
    await tx.insert(statusHistory).values({ entityType: "intervention", entityId: input.id, toStatus: input.status ?? "À planifier", actorUserId, note: "Intervention créée" });
    return input.id;
  });
}

export async function listInterventions() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(interventions).orderBy(desc(interventions.createdAt));
}

export async function createCollection(input: typeof collections.$inferInsert, actorUserId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const collector = (await tx.select().from(collectors).where(and(eq(collectors.id, input.collectorId), eq(collectors.userId, actorUserId), eq(collectors.applicationStatus, "Autorisée"))).limit(1))[0];
    if (!collector) throw new Error("Collecteur non autorisé");
    await tx.insert(collections).values(input);
    await tx.insert(statusHistory).values({ entityType: "collecte", entityId: input.id, toStatus: "Déclarée", actorUserId, note: "Collecte déclarée ; quantité non validée" });
    return input.id;
  });
}

export async function verifyCollection(collectionId: string, verifiedKg: string, actorUserId: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const current = (await tx.select().from(collections).where(eq(collections.id, collectionId)).limit(1))[0];
    if (!current) throw new Error("Collecte introuvable");
    if (current.status !== "Déclarée" || current.paid) throw new Error("La collecte doit être déclarée et non payée");
    await tx.update(collections).set({ verifiedKg, status: "Vérifiée" }).where(eq(collections.id, collectionId));
    await tx.insert(statusHistory).values({ entityType: "collecte", entityId: collectionId, fromStatus: current.status, toStatus: "Vérifiée", actorUserId, note: "Pesée vérifiée ; validation indépendante requise" });
    return { ...current, verifiedKg, status: "Vérifiée" as const };
  });
}

export async function validateCollection(collectionId: string, verifiedKg: string, validatedKg: string, actorUserId: number, paidAmountFcfa?: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const current = (await tx.select().from(collections).where(eq(collections.id, collectionId)).limit(1))[0];
    if (!current) throw new Error("Collecte introuvable");
    if (current.paid || current.status !== "Vérifiée") throw new Error("La collecte doit être vérifiée avant validation ou paiement");
    if (current.verifiedKg === null) throw new Error("La quantité vérifiée est obligatoire avant validation");
    await tx.insert(weighingValidations).values({ collectionId, verifiedKg, validatedKg, validatedByUserId: actorUserId, paidAmountFcfa: paidAmountFcfa ?? null });
    await tx.update(collections).set({ verifiedKg, validatedKg, status: "Validée", paid: paidAmountFcfa !== undefined }).where(eq(collections.id, collectionId));
    await tx.insert(statusHistory).values({ entityType: "collecte", entityId: collectionId, fromStatus: current.status, toStatus: "Validée", actorUserId, note: "Pesée indépendante enregistrée" });
    return { ...current, verifiedKg, validatedKg, status: "Validée", paid: paidAmountFcfa !== undefined };
  });
}

export async function saveGeoImport(input: typeof geoImports.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.insert(geoImports).values(input);
  return input.id;
}

export async function listGeoImports() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(geoImports).orderBy(desc(geoImports.createdAt));
}

export async function createCollectorApplication(input: typeof collectors.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.insert(collectors).values(input).onDuplicateKeyUpdate({ set: { zone: input.zone, availability: input.availability, applicationStatus: "Soumise" } });
  return input.id;
}

export async function listCollectors() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(collectors);
}

export async function authorizeCollector(id: string, actorUserId: number, authorized: boolean) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(collectors).set({ applicationStatus: authorized ? "Autorisée" : "Suspendue", authorizedAt: authorized ? new Date() : null, suspendedAt: authorized ? null : new Date() }).where(eq(collectors.id, id));
  await db.insert(statusHistory).values({ entityType: "collecteur", entityId: id, toStatus: authorized ? "Autorisée" : "Suspendue", actorUserId, note: "Décision administrative" });
  return id;
}

export async function listStatusHistory(entityType: string, entityId: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(statusHistory).where(and(eq(statusHistory.entityType, entityType), eq(statusHistory.entityId, entityId))).orderBy(desc(statusHistory.createdAt));
}
