import { describe, expect, it } from "vitest";
import { calculateMca, normalizeMinMax, validateWeights, type CriterionDefinition } from "./multicriteria";

describe("multicriteria", () => {
  const criteria: CriterionDefinition[] = [
    { id: "density", label: "Densité", weight: 0.6, direction: "maximize", active: true, indispensable: true },
    { id: "distance", label: "Distance", weight: 0.4, direction: "minimize", active: true },
  ];
  it("normalise dans le bon sens", () => {
    expect(normalizeMinMax(10, [0, 10, 20], "maximize")).toBeCloseTo(0.5);
    expect(normalizeMinMax(10, [0, 10, 20], "minimize")).toBeCloseTo(0.5);
    expect(normalizeMinMax(0, [0, 10, 20], "minimize")).toBe(1);
  });
  it("refuse une somme de poids différente de 100 %", () => {
    expect(validateWeights(criteria).valid).toBe(true);
    expect(validateWeights(criteria.map(item => ({ ...item, weight: 0.2 }))).valid).toBe(false);
  });
  it("réagit aux pondérations et renormalise les critères disponibles", () => {
    const rows = [
      { id: "A", values: [{ id: "density", raw: 10 }, { id: "distance", raw: 1 }] },
      { id: "B", values: [{ id: "density", raw: 2 }, { id: "distance", raw: 10 }] },
    ];
    const result = calculateMca(rows, criteria);
    expect(result[0].score).toBeGreaterThan(result[1].score!);
    expect(result[0].provisional).toBe(false);
    const missing = calculateMca([{ id: "C", values: [{ id: "density", raw: 5 }, { id: "distance", raw: null }] }], criteria)[0];
    expect(missing.provisional).toBe(true);
    expect(missing.missing).toContain("Distance");
  });
});
