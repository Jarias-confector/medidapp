export type Source = 'usda' | 'off' | 'mx' | 'custom';

export type Food = {
  id?: string;
  source: Source;
  source_id: string | null;
  name: string;
  brand?: string | null;
  kcal: number;      // todo por 100 g
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  serving_g?: number;
};

export type Entry = {
  id: string;
  food_id: string;
  grams: number;
  meal: Meal;
  eaten_at: string;
  foods?: Food;
};

export type Meal = 'desayuno' | 'comida' | 'cena' | 'snack';

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
