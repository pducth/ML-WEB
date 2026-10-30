export type HairType = 'straight' | 'wavy' | 'curly' | 'coily';
export type HairConcern =
  | 'dryness'
  | 'damage'
  | 'frizz'
  | 'volume'
  | 'color-protection'
  | 'scalp-care';

export interface HairProfile {
  id: string;
  userId: string;
  hairType: HairType;
  concerns: HairConcern[];
  texture: 'fine' | 'medium' | 'thick';
  colorTreated: boolean;
  updatedAt: string;
}
