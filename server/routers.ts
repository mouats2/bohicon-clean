import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createCollectorApplication, createCollection, createIntervention, createSignalement, getSignalement, listCollectors, listDepots, listGeoImports, listInterventions, listSignalements, listStatusHistory, saveGeoImport, updateSignalementStatus, authorizeCollector, verifyCollection, validateCollection } from "./db";
import { depotsSauvages } from "../drizzle/schema";

const municipalProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && !["agent", "admin"].includes(ctx.user.appRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Cette action est réservée à un agent municipal ou administrateur." });
  return next();
});
const collectorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && !["collector", "admin"].includes(ctx.user.appRole)) throw new TRPCError({ code: "FORBIDDEN", message: "Cette action est réservée à un collecteur autorisé." });
  return next();
});
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const attachmentInput = z.object({ id: z.string().max(96), originalName: z.string().min(1).max(255), mimeType: z.string().min(1).max(120), sizeBytes: z.number().int().positive().max(10_000_000), storageKey: z.string().max(255).optional(), status: z.enum(["local", "uploaded", "failed"]).default("local") });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  deposits: router({
    list: publicProcedure.query(() => listDepots()),
    history: municipalProcedure.input(z.object({ id: z.string().max(96) })).query(({ input }) => listStatusHistory("depot", input.id)),
  }),
  signalements: router({
    create: protectedProcedure.input(z.object({ category: z.string().min(1).max(120), severity: z.enum(["Faible", "Moyenne", "Élevée"]), priority: z.enum(["Basse", "Moyenne", "Haute"]), description: z.string().min(1).max(10_000), location: z.string().min(1).max(255), lat: z.number().finite().min(-90).max(90), lng: z.number().finite().min(-180).max(180), arrondissementSource: z.string().min(1).max(190), arrondissementComputed: z.string().max(190).optional(), attachments: z.array(attachmentInput).max(4).default([]) })).mutation(async ({ input, ctx }) => {
      const signalementId = id("SIG");
      await createSignalement({ id: signalementId, authorUserId: ctx.user.id, status: "En attente", category: input.category, severity: input.severity, priority: input.priority, description: input.description, location: input.location, lat: input.lat.toFixed(8), lng: input.lng.toFixed(8), arrondissementSource: input.arrondissementSource, arrondissementComputed: input.arrondissementComputed, provenance: "citizen", rewardCredited: false }, input.attachments);
      return { id: signalementId, status: "En attente" as const };
    }),
    mine: protectedProcedure.query(({ ctx }) => listSignalements(ctx.user.id)),
    list: municipalProcedure.query(() => listSignalements()),
    updateStatus: municipalProcedure.input(z.object({ id: z.string().max(96), status: z.enum(["En cours de vérification", "Validé", "Rejeté", "Doublon", "Traité"]), note: z.string().max(2000).optional() })).mutation(({ input, ctx }) => updateSignalementStatus(input.id, input.status, ctx.user.id, input.note)),
    history: protectedProcedure.input(z.object({ id: z.string().max(96) })).query(async ({ input, ctx }) => {
      const record = await getSignalement(input.id);
      const municipal = ctx.user.role === "admin" || ["agent", "admin"].includes(ctx.user.appRole);
      if (!record || (!municipal && record.authorUserId !== ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne pouvez consulter que votre propre historique." });
      return listStatusHistory("signalement", input.id);
    }),
  }),
  interventions: router({
    list: municipalProcedure.query(() => listInterventions()),
    create: municipalProcedure.input(z.object({ id: z.string().max(96).optional(), siteId: z.string().max(96), siteType: z.enum(["depot", "signalement"]), type: z.string().min(1).max(100), priority: z.enum(["Basse", "Moyenne", "Haute"]), plannedDate: z.coerce.date().optional(), comment: z.string().max(4000).optional() })).mutation(({ input, ctx }) => createIntervention({ id: input.id ?? id("INT"), siteId: input.siteId, siteType: input.siteType, type: input.type, priority: input.priority, plannedDate: input.plannedDate, status: "À planifier", comment: input.comment ?? null }, ctx.user.id)),
  }),
  collectors: router({
    submit: protectedProcedure.input(z.object({ id: z.string().max(96).optional(), zone: z.string().min(1).max(190), availability: z.string().max(255).optional() })).mutation(({ input, ctx }) => createCollectorApplication({ id: input.id ?? id("COL"), userId: ctx.user.id, zone: input.zone, availability: input.availability, applicationStatus: "Soumise" })),
    list: municipalProcedure.query(() => listCollectors()),
    authorize: adminProcedure.input(z.object({ id: z.string().max(96), authorized: z.boolean() })).mutation(({ input, ctx }) => authorizeCollector(input.id, ctx.user.id, input.authorized)),
  }),
  collections: router({
    create: collectorProcedure.input(z.object({ id: z.string().max(96).optional(), collectorId: z.string().max(96), pointId: z.string().max(96), category: z.string().min(1).max(120), declaredKg: z.coerce.number().positive().max(100_000) })).mutation(({ input, ctx }) => createCollection({ id: input.id ?? id("COLL"), collectorId: input.collectorId, pointId: input.pointId, category: input.category, declaredKg: input.declaredKg.toFixed(2), status: "Déclarée", paid: false }, ctx.user.id)),
    verifyWeighing: municipalProcedure.input(z.object({ collectionId: z.string().max(96), verifiedKg: z.coerce.number().nonnegative().max(100_000) })).mutation(({ input, ctx }) => verifyCollection(input.collectionId, input.verifiedKg.toFixed(2), ctx.user.id)),
    validateWeighing: municipalProcedure.input(z.object({ collectionId: z.string().max(96), verifiedKg: z.coerce.number().nonnegative().max(100_000), validatedKg: z.coerce.number().nonnegative().max(100_000), paidAmountFcfa: z.number().int().nonnegative().optional() })).mutation(({ input, ctx }) => validateCollection(input.collectionId, input.verifiedKg.toFixed(2), input.validatedKg.toFixed(2), ctx.user.id, input.paidAmountFcfa)),
  }),
  geoImports: router({
    list: municipalProcedure.query(() => listGeoImports()),
    register: municipalProcedure.input(z.object({ id: z.string().max(96).optional(), fileName: z.string().min(1).max(255), layerName: z.string().min(1).max(190), sourceCrs: z.string().max(80).optional(), displayCrs: z.string().max(80).optional(), featureCount: z.number().int().nonnegative(), validCount: z.number().int().nonnegative(), warningCount: z.number().int().nonnegative(), properties: z.array(z.string()).max(500), sourceChecksum: z.string().max(128).optional() })).mutation(({ input, ctx }) => saveGeoImport({ id: input.id ?? id("GEO"), fileName: input.fileName, layerName: input.layerName, sourceCrs: input.sourceCrs, displayCrs: input.displayCrs, featureCount: input.featureCount, validCount: input.validCount, warningCount: input.warningCount, properties: input.properties, sourceChecksum: input.sourceChecksum, importedByUserId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;
