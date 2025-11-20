// No imports needed for keys anymore

/**
 * Converts image file to base64 string
 * (Keep your existing helper function)
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
}

export async function scanRecipe(imageFile) {
  try {
    // 1. Prepare image data
    const base64Image = await fileToBase64(imageFile);
    const mimeType = imageFile.type || 'image/jpeg';

    // 2. Send to YOUR backend (not Google directly)
    const response = await fetch('/api/scan-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        base64Image, 
        mimeType 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to scan recipe');
    }

    // 3. Return the clean data
    return {
      success: true,
      recipe: data.recipe,
    };

  } catch (error) {
    console.error('Recipe scanning error:', error);
    return {
      success: false,
      error: error.message || 'Failed to scan recipe. Please try again.',
    };
  }
}

// Keep your existing validateRecipeData function [cite: 31]
export function validateRecipeData(recipeData) {
  // ... (Your existing validation logic is good, keep it) ...
    const cleaned = {
    name: recipeData.name?.trim() || 'Untitled Recipe',
    description: recipeData.description?.trim() || '',
    servings: recipeData.servings?.trim() || '4 servings',
    prepTime: recipeData.prepTime?.trim() || '',
    cookTime: recipeData.cookTime?.trim() || '',
    ingredients: [],
    instructions: recipeData.instructions?.trim() || '',
    notes: recipeData.notes?.trim() || '',
  };

  if (Array.isArray(recipeData.ingredients)) {
    cleaned.ingredients = recipeData.ingredients
      .filter(ing => ing.name && ing.name.trim())
      .map(ing => ({
        name: ing.name.trim(),
        amount: ing.amount?.trim() || '',
        category: ing.category?.toLowerCase() || 'other',
      }));
  }

  if (cleaned.ingredients.length === 0) {
    cleaned.ingredients.push({ name: '', amount: '', category: 'other' });
  }

  return cleaned;
}