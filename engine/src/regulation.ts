// Décision de régulation d'une séance de musculation bas du corps — doc 04 §4.3 (version simplifiée,
// sans Readiness ni déplacement de séance : sert à vérifier que les seuils « tombent juste »).

export type LowerBodyAction = 'inchangee' | 'volume-20' | 'volume-35' | 'haut-du-corps';

export interface LowerBodyDecision {
  action: LowerBodyAction;
  label: string;
}

export function lowerBodyDecision(legFatigue: number): LowerBodyDecision {
  if (legFatigue < 40) return { action: 'inchangee', label: 'Inchangée' };
  if (legFatigue < 60) return { action: 'volume-20', label: 'Volume −20 %, RPE −0,5' };
  if (legFatigue <= 75) return { action: 'volume-35', label: 'Volume −35 %, RPE ≤ 7, sans excentrique lourd' };
  return { action: 'haut-du-corps', label: 'Remplacée par haut du corps + gainage' };
}
