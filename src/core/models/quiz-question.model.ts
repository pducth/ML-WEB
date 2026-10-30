export interface QuizQuestionOption {
  id: string;
  label: string;
  description?: string;
  value: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  helpText?: string;
  order: number;
  required: boolean;
  options: QuizQuestionOption[];
}
