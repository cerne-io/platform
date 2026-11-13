
export interface QuestionChoice {
  id: string;
  label: string;
  translations?: Record<string, string>;
}

export interface MultipleChoiceQuestion {
  id: string;
  label: string;
  choices: QuestionChoice[];
  translations?: Record<string, string>;
}
