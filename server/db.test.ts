import { describe, expect, it } from "vitest";
import { SIGNALMENT_TRANSITIONS } from "./db";

describe("signalement status transitions", () => {
  it("autorise la vérification puis le traitement, sans retour arrière", () => {
    expect(SIGNALMENT_TRANSITIONS["En attente"]).toContain("En cours de vérification");
    expect(SIGNALMENT_TRANSITIONS["Validé"]).toContain("Traité");
    expect(SIGNALMENT_TRANSITIONS["Traité"]).toEqual([]);
    expect(SIGNALMENT_TRANSITIONS["Rejeté"]).not.toContain("Validé");
  });
});
