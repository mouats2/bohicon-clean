export const SIGNALMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  "En attente": ["En cours de vérification", "Validé", "Rejeté", "Doublon"],
  "En cours de vérification": ["Validé", "Rejeté", "Doublon"],
  "Validé": ["Traité"],
  "Rejeté": [],
  "Doublon": [],
  "Traité": [],
};
