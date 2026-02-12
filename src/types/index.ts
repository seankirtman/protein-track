export interface UserProfile {
  displayName: string;
  email: string;
  weight?: number;
  height?: number;
  age?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal?: "bulk" | "cut" | "maintain";
  dailyProteinGoal?: number;
}

export interface Set {
  reps?: number;
  weight?: number;
  distance?: number;  // miles
  time?: number;      // minutes
}

export type ExerciseType = "strength" | "cardio";

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: Set[];
  completed?: boolean;
}

export interface Workout {
  id: string;
  date: string;
  notes?: string;
  exercises: Exercise[];
  createdAt?: string;
}

export interface FoodEntry {
  id: string;
  name: string;
  quantity?: string;
  protein: number;
  calories?: number;
  time?: string;
  eaten?: boolean;
}

export interface NutritionDay {
  date: string;
  proteinGoal: number;
  foods: FoodEntry[];
  totalProtein: number;
  aiRecommendations?: string[];
}

export interface PhotoEntry {
  id: string;
  date: string;
  photoURL: string;
  notes?: string;
  createdAt?: string;
}
