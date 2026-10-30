import type { HairProfile } from './hair-profile.model';

export interface QuizResult {
  id: string;
  userId: string;
  answers: Record<string, string>;
  hairProfile?: HairProfile;
  recommendedProductIds: string[];
  submittedAt: string;
}
