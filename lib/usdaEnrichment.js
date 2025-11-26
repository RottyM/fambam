// USDA Enrichment for Spoonacular Recipes
// This module looks up ingredients in USDA database to get accurate nutritional data

import { searchFoods, getFoodDetails } from './fdc';

// Common unit conversions to grams (approximate)
const UNIT_CONVERSIONS = {
  // Volume to grams (water-based, approximate)
  'cup': 240,
  'cups': 240,
  'tablespoon': 15,
  'tablespoons': 15,
  'tbsp': 15,
  'teaspoon': 5,
  'teaspoons': 5,
  'tsp': 5,
  'fluid ounce': 30,
  'fl oz': 30,
  // Weight
  'gram': 1,
  'grams': 1,
  'g': 1,
  'kilogram': 1000,
  'kg': 1000,
  'ounce': 28.35,
  'ounces': 28.35,
  'oz': 28.35,
  'pound': 453.59,
  'pounds': 453.59,
  'lb': 453.59,
  'lbs': 453.59,
  // Pieces (estimate)
  'piece': 100,
  'pieces': 100,
  'item': 100,
  'items': 100,
  'whole': 100,
  'medium': 100,
  'large': 150,
  'small': 50,
};

// Ingredient-specific density overrides for common dense items to avoid overestimation.
const DENSITY_OVERRIDES = [
  { keywords: ['flour', 'sugar', 'oat', 'grain', 'rice', 'pasta', 'noodle', 'bean', 'lentil'], perCup: 120, perTablespoon: 8 },
  { keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta'], perCup: 110, perTablespoon: 6 },
  { keywords: ['oil', 'olive oil', 'canola', 'vegetable oil', 'avocado oil'], perCup: 218, perTablespoon: 13.5 },
  { keywords: ['butter', 'margarine', 'ghee'], perCup: 227, perTablespoon: 14 },
];

function getDensityOverride(normalizedUnit, ingredientName = '') {
  const name = ingredientName.toLowerCase();
  const isCup = normalizedUnit.includes('cup');
  const isTablespoon = normalizedUnit.includes('tablespoon') || normalizedUnit === 'tbsp';

  if (!isCup && !isTablespoon) return null;

  for (const override of DENSITY_OVERRIDES) {
    if (override.keywords.some(keyword => name.includes(keyword))) {
      if (isCup && override.perCup) return override.perCup;
      if (isTablespoon && override.perTablespoon) return override.perTablespoon;
    }
  }

  return null;
}

/**
 * Converts ingredient amount to grams (approximate)
 */
function convertToGrams(amount, unit, ingredientName = '') {
  const normalizedUnit = unit?.toLowerCase().trim() || '';
  const densityOverride = getDensityOverride(normalizedUnit, ingredientName);
  if (densityOverride) {
    return amount * densityOverride;
  }

  const conversion = UNIT_CONVERSIONS[normalizedUnit];

  if (conversion) {
    return amount * conversion;
  }

  // Default to treating the amount as grams if unit is unknown
  return amount || 100;
}

/**
 * Searches USDA database for an ingredient
 * Returns the best match with nutritional data
 */
export async function lookupIngredient(ingredientName, amount = 100, unit = 'g') {
  try {
    // Clean up ingredient name for better search results
    const cleanName = ingredientName
      .toLowerCase()
      .replace(/[,\(\)]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ')      // Normalize spaces
      .trim();

    // Search USDA database
    const results = await searchFoods(cleanName, 5);

    if (results.length === 0) {
      console.warn(`No USDA match found for: ${ingredientName}`);
      return null;
    }

    // Pick the best match using simple heuristics (prefer core foods, avoid fast food/branded outliers).
    const bestMatch = selectBestUsdaMatch(cleanName, results);
    const foodDetails = await getFoodDetails(bestMatch.fdcId);

    // Convert amount to grams for calculation
    const gramsAmount = convertToGrams(amount, unit, ingredientName);

    // Calculate serving size ratio
    const servingSize = foodDetails.servingSize || 100; // Default to 100g
    const ratio = gramsAmount / servingSize;

    // Extract and scale nutrients
    const nutrients = {};
    if (foodDetails.foodNutrients) {
      foodDetails.foodNutrients.forEach(nutrient => {
        const name = nutrient.nutrient?.name || nutrient.nutrientName;
        const value = (nutrient.amount || nutrient.value || 0) * ratio;
        const unit = nutrient.nutrient?.unitName || nutrient.unitName;

        if (name && value !== undefined) {
          nutrients[name] = { value, unit };
        }
      });
    }

    return {
      fdcId: bestMatch.fdcId,
      description: foodDetails.description,
      matchedName: bestMatch.description,
      originalName: ingredientName,
      amount: gramsAmount,
      nutrients,
      servingSize: foodDetails.servingSize,
      servingSizeUnit: foodDetails.servingSizeUnit,
    };
  } catch (error) {
    console.error(`Error looking up ingredient "${ingredientName}":`, error);
    return null;
  }
}

function selectBestUsdaMatch(cleanName, results) {
  const exclusions = ['fast food', 'restaurant', 'babyfood', 'infant', 'school lunch'];
  const priorityTypes = ['Foundation', 'SR Legacy', 'Survey (FNDDS)'];

  const scored = results.map(result => {
    const desc = (result.description || '').toLowerCase();
    let score = 0;

    if (desc.startsWith(cleanName)) score += 30;
    if (desc.includes(cleanName)) score += 15;

    exclusions.forEach(word => {
      if (desc.includes(word)) score -= 40;
    });

    if (priorityTypes.includes(result.dataType)) score += 15;
    if (result.dataType === 'Branded') score -= 5;

    const lengthDiff = Math.abs(desc.length - cleanName.length);
    score -= Math.min(10, lengthDiff / 5);

    return { result, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.result || results[0];
}

/**
 * Enriches a Spoonacular recipe with USDA nutritional data
 * Looks up each ingredient and calculates total nutrition
 */
export async function enrichRecipeWithUSDA(recipe, onProgress = null) {
  if (!recipe.extendedIngredients || recipe.extendedIngredients.length === 0) {
    return {
      success: false,
      error: 'No ingredients found in recipe',
    };
  }

  const enrichedIngredients = [];
  const failedIngredients = [];
  let processedCount = 0;

  // Process each ingredient
  for (const ingredient of recipe.extendedIngredients) {
    const ingredientName = ingredient.name || ingredient.original;
    const amount = ingredient.amount || ingredient.measures?.us?.amount || 1;
    const unit = ingredient.unit || ingredient.measures?.us?.unitShort || 'serving';

    // Report progress
    if (onProgress) {
      onProgress({
        current: processedCount + 1,
        total: recipe.extendedIngredients.length,
        ingredient: ingredientName,
      });
    }

    try {
      const usdaData = await lookupIngredient(ingredientName, amount, unit);

      if (usdaData) {
        enrichedIngredients.push({
          ...ingredient,
          usdaData,
        });
      } else {
        failedIngredients.push(ingredientName);
      }
    } catch (error) {
      console.error(`Failed to enrich ingredient: ${ingredientName}`, error);
      failedIngredients.push(ingredientName);
    }

    processedCount++;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Calculate total nutrition from USDA data.
  // We pass servings so we can present per-serving numbers for parity with Spoonacular.
  const servings = Number(recipe.servings) || 1;
  const totalNutrition = calculateTotalNutrition(enrichedIngredients, servings);

  return {
    success: true,
    enrichedIngredients,
    failedIngredients,
    totalNutrition,
    coverage: (enrichedIngredients.length / recipe.extendedIngredients.length) * 100,
  };
}

/**
 * Calculates total nutrition from enriched ingredients
 */
function calculateTotalNutrition(enrichedIngredients, servings = 1) {
  const totals = {};

  enrichedIngredients.forEach(ingredient => {
    if (!ingredient.usdaData?.nutrients) return;

    Object.entries(ingredient.usdaData.nutrients).forEach(([name, data]) => {
      if (!totals[name]) {
        totals[name] = {
          name,
          amount: 0,
          unit: data.unit,
        };
      }
      totals[name].amount += data.value;
    });
  });

  // Convert to array format (similar to Spoonacular)
  const totalNutrients = Object.values(totals).map(nutrient => ({
    name: nutrient.name,
    amount: parseFloat(nutrient.amount.toFixed(2)),
    unit: nutrient.unit,
  }));

  // Normalize to per-serving values for display so they align with Spoonacular numbers.
  const servingsNormalized = Number.isFinite(servings) && servings > 0 ? servings : 1;
  const perServingNutrients = totalNutrients.map(nutrient => ({
    ...nutrient,
    amount: parseFloat((nutrient.amount / servingsNormalized).toFixed(2)),
  }));

  // Sort by importance (calories, protein, fat, carbs first)
  const importantNutrients = ['Energy', 'Protein', 'Total lipid (fat)', 'Carbohydrate, by difference'];
  perServingNutrients.sort((a, b) => {
    const aIndex = importantNutrients.indexOf(a.name);
    const bIndex = importantNutrients.indexOf(b.name);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  return {
    nutrients: perServingNutrients,
    totals: totalNutrients,
    servings: servingsNormalized,
    source: 'USDA FoodData Central',
  };
}

/**
 * Formats USDA nutrient names to be more user-friendly
 */
export function formatNutrientName(name) {
  const nameMap = {
    'Energy': 'Calories',
    'Protein': 'Protein',
    'Total lipid (fat)': 'Total Fat',
    'Carbohydrate, by difference': 'Carbohydrates',
    'Fiber, total dietary': 'Dietary Fiber',
    'Sugars, total including NLEA': 'Total Sugars',
    'Calcium, Ca': 'Calcium',
    'Iron, Fe': 'Iron',
    'Sodium, Na': 'Sodium',
    'Vitamin C, total ascorbic acid': 'Vitamin C',
    'Vitamin A, IU': 'Vitamin A',
    'Cholesterol': 'Cholesterol',
    'Fatty acids, total saturated': 'Saturated Fat',
    'Fatty acids, total trans': 'Trans Fat',
  };

  return nameMap[name] || name;
}
