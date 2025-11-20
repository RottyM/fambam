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

/**
 * Converts ingredient amount to grams (approximate)
 */
function convertToGrams(amount, unit) {
  const normalizedUnit = unit?.toLowerCase().trim() || '';
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

    // Get the first result (best match)
    const bestMatch = results[0];
    const foodDetails = await getFoodDetails(bestMatch.fdcId);

    // Convert amount to grams for calculation
    const gramsAmount = convertToGrams(amount, unit);

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

  // Calculate total nutrition from USDA data
  const totalNutrition = calculateTotalNutrition(enrichedIngredients);

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
function calculateTotalNutrition(enrichedIngredients) {
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
  const nutrients = Object.values(totals).map(nutrient => ({
    name: nutrient.name,
    amount: parseFloat(nutrient.amount.toFixed(2)),
    unit: nutrient.unit,
  }));

  // Sort by importance (calories, protein, fat, carbs first)
  const importantNutrients = ['Energy', 'Protein', 'Total lipid (fat)', 'Carbohydrate, by difference'];
  nutrients.sort((a, b) => {
    const aIndex = importantNutrients.indexOf(a.name);
    const bIndex = importantNutrients.indexOf(b.name);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  return {
    nutrients,
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
