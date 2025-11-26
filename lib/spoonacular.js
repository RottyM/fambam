export async function searchRecipes(query, maxReadyTime = null) {
  try {
    const params = new URLSearchParams({
      query: query || '',
      ...(maxReadyTime ? { maxReadyTime: maxReadyTime.toString() } : {}),
    });

    const response = await fetch(`/api/recipes/search?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to search recipes');
    }

    return data;
  } catch (error) {
    console.error('Error searching recipes:', error);
    throw error;
  }
}

export async function getRecipeInformation(id) {
  try {
    const response = await fetch(`/api/recipes/information/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get recipe information');
    }

    return data;
  } catch (error) {
    console.error('Error getting recipe information:', error);
    throw error;
  }
}

export async function getRecipeNutrition(id) {
  try {
    const response = await fetch(`/api/recipes/nutrition/${id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get nutrition info');
    }

    return data;
  } catch (error) {
    console.error('Error getting nutrition:', error);
    throw error;
  }
}
