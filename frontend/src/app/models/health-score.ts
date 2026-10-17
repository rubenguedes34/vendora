export interface HealthScoreCategory {
  key: string;
  name: string;
  weight: number;
  score: number;
  value: number | null;
  unit: string;
  suggestion: string;
  description: string;
  suggestion_key?: string;
  suggestion_params?: Record<string, string | number>;
}

export interface HealthScore {
  score: {
    overall_score: number;
    as_of: string;
    categories: HealthScoreCategory[];
  };
  history: { month: string; score: number }[];
}
