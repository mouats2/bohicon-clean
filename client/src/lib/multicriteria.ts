export type CriterionDirection = "maximize" | "minimize";
export type CriterionDefinition = { id: string; label: string; weight: number; direction: CriterionDirection; active: boolean; indispensable?: boolean };
export type CriterionValue = { id: string; raw: number | null };
export type McaRow = { id: string; score: number | null; className: "Faible" | "Moyenne" | "Élevée" | "Non calculable"; values: Record<string, { raw: number | null; normalized: number | null; weight: number }>; missing: string[]; provisional: boolean; justification: string };

export function validateWeights(criteria: CriterionDefinition[]): { valid: boolean; total: number; message: string } {
  const active = criteria.filter(item => item.active);
  const total = active.reduce((sum, item) => sum + item.weight, 0);
  const valid = active.length > 0 && Math.abs(total - 1) < 0.0001 && active.every(item => item.weight >= 0);
  return { valid, total, message: valid ? "Les poids actifs totalisent 100 %." : `Les poids actifs totalisent ${(total * 100).toFixed(1)} %. La somme doit être exactement 100 %.` };
}

export function normalizeMinMax(value: number, values: Array<number | null>, direction: CriterionDirection): number | null {
  const available = values.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  if (!Number.isFinite(value) || available.length === 0) return null;
  const min = Math.min(...available);
  const max = Math.max(...available);
  if (max === min) return 1;
  const normalized = (value - min) / (max - min);
  return direction === "maximize" ? normalized : 1 - normalized;
}

export function calculateMca(rows: Array<{ id: string; values: CriterionValue[] }>, criteria: CriterionDefinition[]): McaRow[] {
  const active = criteria.filter(item => item.active);
  const weightCheck = validateWeights(criteria);
  return rows.map(row => {
    const details: McaRow["values"] = {};
    const missing: string[] = [];
    let score = 0;
    let availableWeight = 0;
    active.forEach(criterion => {
      const value = row.values.find(item => item.id === criterion.id)?.raw ?? null;
      const allValues = rows.map(other => other.values.find(item => item.id === criterion.id)?.raw ?? null);
      const normalized = value === null ? null : normalizeMinMax(value, allValues, criterion.direction);
      details[criterion.id] = { raw: value, normalized, weight: criterion.weight };
      if (normalized === null) missing.push(criterion.label);
      else { score += normalized * criterion.weight; availableWeight += criterion.weight; }
    });
    const indispensableMissing = active.some(item => item.indispensable && missing.includes(item.label));
    const provisional = !weightCheck.valid || indispensableMissing || missing.length > 0;
    const finalScore = availableWeight > 0 && !indispensableMissing ? score / availableWeight : null;
    const className = finalScore === null ? "Non calculable" : finalScore >= 0.66 ? "Élevée" : finalScore >= 0.33 ? "Moyenne" : "Faible";
    const justification = finalScore === null ? (indispensableMissing ? "Critère indispensable indisponible." : "Aucune valeur suffisante pour calculer un score.") : missing.length ? `Score provisoire : ${missing.join(", ")} non disponible(s), poids restants renormalisés.` : "Score normalisé selon les poids actifs et les valeurs observées.";
    return { id: row.id, score: finalScore, className, values: details, missing, provisional, justification };
  });
}
