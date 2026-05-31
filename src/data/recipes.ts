export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  title: string;
  description: string;
  image?: string;
}

export type WeatherCondition = 'hot' | 'cold' | 'neutral' | 'rainy';

export interface Recipe {
  id: string;
  name: string;
  country: string;
  description: string;
  image: string;
  ingredients: string[];
  equipment: string[];
  detailedIngredients: Ingredient[];
  steps: Step[];
  weatherSuitability: WeatherCondition[];
  category: 'Espresso' | 'Latte' | 'Cappuccino' | 'Cold Brew' | 'Specialty';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  prepTime: string;
}

export const recipes: Recipe[] = [];
