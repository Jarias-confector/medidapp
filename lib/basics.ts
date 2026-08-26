import type { Food } from './types';

const BASIC_FOODS: Food[] = [
  {
    source: 'mx',
    source_id: 'b_huevo_entero',
    name: 'Huevo entero (crudo o cocido)',
    brand: 'Genérico',
    kcal: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    serving_g: 50,
  },
  {
    source: 'mx',
    source_id: 'b_clara_huevo',
    name: 'Clara de huevo (huevo blanco)',
    brand: 'Genérico',
    kcal: 52,
    protein: 10.9,
    carbs: 0.7,
    fat: 0.2,
    serving_g: 30,
  },
  {
    source: 'mx',
    source_id: 'b_pechuga_pollo_cocida',
    name: 'Pechuga de pollo (cocida, sin piel)',
    brand: 'Genérico',
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_pechuga_pollo_cruda',
    name: 'Pechuga de pollo (cruda)',
    brand: 'Genérico',
    kcal: 120,
    protein: 22.5,
    carbs: 0,
    fat: 2.6,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_carne_res_molida',
    name: 'Carne de res molida (magra 90/10, cocida)',
    brand: 'Genérico',
    kcal: 214,
    protein: 26,
    carbs: 0,
    fat: 11.5,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_lomo_cerdo',
    name: 'Lomo de cerdo (cocido)',
    brand: 'Genérico',
    kcal: 206,
    protein: 30,
    carbs: 0,
    fat: 8.9,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_atun_agua',
    name: 'Atún en agua (drenado)',
    brand: 'Genérico',
    kcal: 116,
    protein: 26,
    carbs: 0,
    fat: 1,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_salmon_cocido',
    name: 'Salmón (cocido)',
    brand: 'Genérico',
    kcal: 206,
    protein: 22,
    carbs: 0,
    fat: 12.3,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_leche_entera',
    name: 'Leche entera de vaca',
    brand: 'Genérico',
    kcal: 61,
    protein: 3.2,
    carbs: 4.8,
    fat: 3.25,
    serving_g: 240,
  },
  {
    source: 'mx',
    source_id: 'b_leche_descremada',
    name: 'Leche descremada (light)',
    brand: 'Genérico',
    kcal: 34,
    protein: 3.4,
    carbs: 5,
    fat: 0.1,
    serving_g: 240,
  },
  {
    source: 'mx',
    source_id: 'b_yogur_griego',
    name: 'Yogur griego natural (sin azúcar)',
    brand: 'Genérico',
    kcal: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    serving_g: 125,
  },
  {
    source: 'mx',
    source_id: 'b_queso_panela',
    name: 'Queso panela',
    brand: 'Genérico',
    kcal: 240,
    protein: 18,
    carbs: 3,
    fat: 17,
    serving_g: 30,
  },
  {
    source: 'mx',
    source_id: 'b_queso_cottage',
    name: 'Queso cottage',
    brand: 'Genérico',
    kcal: 98,
    protein: 11,
    carbs: 3.4,
    fat: 4.3,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_arroz_blanco',
    name: 'Arroz blanco (cocido)',
    brand: 'Genérico',
    kcal: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_arroz_integral',
    name: 'Arroz integral (cocido)',
    brand: 'Genérico',
    kcal: 112,
    protein: 2.3,
    carbs: 23.5,
    fat: 0.8,
    serving_g: 100,
  },
  {
    source: 'mx',
    source_id: 'b_avena_hojuelas',
    name: 'Avena en hojuelas (cruda)',
    brand: 'Genérico',
    kcal: 389,
    protein: 16.9,
    carbs: 66,
    fat: 6.9,
    serving_g: 40,
  },
  {
    source: 'mx',
    source_id: 'b_tortilla_maiz',
    name: 'Tortilla de maíz',
    brand: 'Genérico',
    kcal: 218,
    protein: 5.7,
    carbs: 44.6,
    fat: 2.3,
    serving_g: 30,
  },
  {
    source: 'mx',
    source_id: 'b_pan_blanco',
    name: 'Pan de caja blanco',
    brand: 'Genérico',
    kcal: 265,
    protein: 9,
    carbs: 49,
    fat: 3.2,
    serving_g: 25,
  },
  {
    source: 'mx',
    source_id: 'b_pan_integral',
    name: 'Pan integral de caja',
    brand: 'Genérico',
    kcal: 247,
    protein: 13,
    carbs: 41,
    fat: 3.4,
    serving_g: 28,
  },
  {
    source: 'mx',
    source_id: 'b_platano',
    name: 'Plátano (banana / guineo)',
    brand: 'Genérico',
    kcal: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    serving_g: 120,
  },
  {
    source: 'mx',
    source_id: 'b_manzana',
    name: 'Manzana (roja o verde)',
    brand: 'Genérico',
    kcal: 52,
    protein: 0.3,
    carbs: 13.8,
    fat: 0.2,
    serving_g: 150,
  },
  {
    source: 'mx',
    source_id: 'b_aguacate',
    name: 'Aguacate (palta)',
    brand: 'Genérico',
    kcal: 160,
    protein: 2,
    carbs: 8.5,
    fat: 14.7,
    serving_g: 50,
  },
  {
    source: 'mx',
    source_id: 'b_almendras',
    name: 'Almendras',
    brand: 'Genérico',
    kcal: 579,
    protein: 21.2,
    carbs: 21.6,
    fat: 49.9,
    serving_g: 15,
  },
  {
    source: 'mx',
    source_id: 'b_crema_cacahuate',
    name: 'Crema de cacahuate (mantequilla de maní)',
    brand: 'Genérico',
    kcal: 588,
    protein: 25,
    carbs: 20,
    fat: 50,
    serving_g: 16,
  },
  {
    source: 'mx',
    source_id: 'b_aceite_oliva',
    name: 'Aceite de oliva (o vegetal)',
    brand: 'Genérico',
    kcal: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    serving_g: 14,
  },
  {
    source: 'mx',
    source_id: 'b_mantequilla',
    name: 'Mantequilla',
    brand: 'Genérico',
    kcal: 717,
    protein: 0.9,
    carbs: 0.1,
    fat: 81,
    serving_g: 10,
  },
  {
    source: 'mx',
    source_id: 'b_papa_cocida',
    name: 'Papa (patata) cocida sin piel',
    brand: 'Genérico',
    kcal: 87,
    protein: 1.9,
    carbs: 20,
    fat: 0.1,
    serving_g: 150,
  },
  {
    source: 'mx',
    source_id: 'b_camote_cocido',
    name: 'Camote (batata / boniato) cocido',
    brand: 'Genérico',
    kcal: 86,
    protein: 1.6,
    carbs: 20,
    fat: 0.1,
    serving_g: 150,
  },
  {
    source: 'mx',
    source_id: 'b_brocoli_cocido',
    name: 'Brócoli (cocido)',
    brand: 'Genérico',
    kcal: 35,
    protein: 2.4,
    carbs: 7,
    fat: 0.4,
    serving_g: 85,
  },
  {
    source: 'mx',
    source_id: 'b_espinaca_cruda',
    name: 'Espinaca (cruda)',
    brand: 'Genérico',
    kcal: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    serving_g: 30,
  },
  {
    source: 'mx',
    source_id: 'b_jitomate',
    name: 'Jitomate (tomate rojo)',
    brand: 'Genérico',
    kcal: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    serving_g: 120,
  },
  {
    source: 'mx',
    source_id: 'b_zanahoria',
    name: 'Zanahoria (cruda)',
    brand: 'Genérico',
    kcal: 41,
    protein: 0.9,
    carbs: 9.6,
    fat: 0.2,
    serving_g: 60,
  },
  {
    source: 'mx',
    source_id: 'b_frijoles_negros',
    name: 'Frijoles negros (cocidos)',
    brand: 'Genérico',
    kcal: 132,
    protein: 8.9,
    carbs: 23.7,
    fat: 0.5,
    serving_g: 130,
  },
  {
    source: 'mx',
    source_id: 'b_lentejas_cocidas',
    name: 'Lentejas (cocidas)',
    brand: 'Genérico',
    kcal: 116,
    protein: 9,
    carbs: 20,
    fat: 0.4,
    serving_g: 130,
  },
];

function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

function matchTerm(term: string, targetWords: string[]): boolean {
  if (term.length < 2) return false;
  
  for (const word of targetWords) {
    if (word.includes(term) || term.includes(word)) return true;
    if (term.length >= 3) {
      const dist = levenshtein(term, word);
      const maxAllowed = term.length > 5 ? 2 : 1;
      if (dist <= maxAllowed) return true;
    }
  }
  return false;
}

/**
 * Busca alimentos básicos locales que no requieren API keys.
 * Soporta tolerancia a errores ortográficos menores mediante distancia Levenshtein.
 */
export function searchBasics(query: string): Food[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const terms = q.split(/\s+/);

  return BASIC_FOODS.filter((food) => {
    // Quitar caracteres especiales y separar palabras
    const foodWords = food.name
      .toLowerCase()
      .replace(/[(),/]/g, '')
      .split(/\s+/);
    
    // Todos los términos ingresados deben coincidir con alguna palabra del alimento (con tolerancia)
    return terms.every((term) => matchTerm(term, foodWords));
  });
}
