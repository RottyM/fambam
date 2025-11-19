const API_KEY = process.env.NEXT_PUBLIC_SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

export async function searchRecipes(query, maxReadyTime = 30) {
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      query: query || '',
      maxReadyTime: maxReadyTime,
      number: 10,
      instructionsRequired: true,
      addRecipeInformation: true,
      addRecipeNutrition: true,
    });

    const response = await fetch(`${BASE_URL}/recipes/complexSearch?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to search recipes');
    }

    return data.results || [];
  } catch (error) {
    console.error('Error searching recipes:', error);
    throw error;
  }
}

export async function getRecipeInformation(id) {
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      includeNutrition: true,
    });

    const response = await fetch(`${BASE_URL}/recipes/${id}/information?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get recipe information');
    }

    return data;
  } catch (error) {
    console.error('Error getting recipe information:', error);
    throw error;
  }
}

export async function getRecipeNutrition(id) {
  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
    });

    const response = await fetch(`${BASE_URL}/recipes/${id}/nutritionWidget.json?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get nutrition info');
    }

    return data;
  } catch (error) {
    console.error('Error getting nutrition:', error);
    throw error;
  }
}