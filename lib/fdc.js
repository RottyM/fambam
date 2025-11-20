// USDA FoodData Central API functions

const API_BASE = 'https://api.nal.usda.gov/fdc/v1';

export async function searchFoods(query, pageSize = 10) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FDC_API_KEY;
    if (!apiKey || apiKey === 'your_fdc_api_key_here') {
      throw new Error('FDC API key not configured');
    }

    const response = await fetch(
      `${API_BASE}/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&pageSize=${pageSize}`
    );

    if (!response.ok) {
      throw new Error(`FDC API error: ${response.status}`);
    }

    const data = await response.json();
    return data.foods || [];
  } catch (error) {
    console.error('Error searching foods:', error);
    throw error;
  }
}

export async function getFoodDetails(fdcId) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FDC_API_KEY;
    if (!apiKey || apiKey === 'your_fdc_api_key_here') {
      throw new Error('FDC API key not configured');
    }

    const response = await fetch(`${API_BASE}/food/${fdcId}?api_key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`FDC API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting food details:', error);
    throw error;
  }
}

// Helper function to extract key nutrients from food data
export function extractNutrients(foodData) {
  const nutrients = {};
  if (foodData.foodNutrients) {
    foodData.foodNutrients.forEach(nutrient => {
      const name = nutrient.nutrientName;
      const value = nutrient.value;
      const unit = nutrient.unitName;
      nutrients[name] = { value, unit };
    });
  }
  return nutrients;
}