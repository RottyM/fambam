'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRecipes, useGroceries } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { searchRecipes, getRecipeInformation, getRecipeNutrition } from '@/lib/spoonacular';
import { enrichRecipeWithUSDA, formatNutrientName } from '@/lib/usdaEnrichment';
import { FaPlus, FaTrash, FaShoppingCart, FaCalendar, FaSearch, FaCamera, FaYoutube } from 'react-icons/fa';
import RecipeScannerModal from '@/components/RecipeScannerModal';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import Image from 'next/image';

function RecipesContent() {
  const { recipes, loading, addRecipe, deleteRecipe } = useRecipes();
  const { addGroceryItem } = useGroceries();
  const { userData } = useAuth();
  const { theme, currentTheme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedSearchRecipe, setSelectedSearchRecipe] = useState(null);
  const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('my-recipes');
  const [usdaNutrition, setUsdaNutrition] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(null);
  const [nutritionSource, setNutritionSource] = useState('spoonacular'); // 'spoonacular' or 'usda'
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    servings: '',
    prepTime: '',
    ingredients: [{ name: '', amount: '', category: 'other' }],
    instructions: '',
    imageFile: null,
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchRecipes(searchQuery);
      setSearchResults(results);
      setActiveTab('search-results');
      toast.success(`Found ${results.length} recipes!`);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search recipes. Please check your API key.');
    } finally {
      setSearching(false);
    }
  };

  const handleViewRecipeDetails = async (recipeId) => {
    setLoadingRecipeDetails(true);
    try {
      // Fetch Spoonacular recipe information
      const fullRecipe = await getRecipeInformation(recipeId);

      // Fetch nutrition separately as it might not be included
      try {
        const nutritionData = await getRecipeNutrition(recipeId);
        fullRecipe.nutrition = nutritionData;
      } catch (nutritionError) {
        console.warn('Failed to fetch nutrition data:', nutritionError);
      }

      setSelectedSearchRecipe(fullRecipe);
      // Reset USDA nutrition state when loading new recipe
      setUsdaNutrition(null);
      setNutritionSource('spoonacular');
    } catch (error) {
      console.error('Failed to get recipe details:', error);
      toast.error('Failed to load recipe details');
    } finally {
      setLoadingRecipeDetails(false);
    }
  };

  const handleEnrichWithUSDA = async (recipe) => {
    setIsEnriching(true);
    setEnrichmentProgress({ current: 0, total: recipe.extendedIngredients?.length || 0 });

    try {
      const result = await enrichRecipeWithUSDA(recipe, (progress) => {
        setEnrichmentProgress(progress);
      });

      if (result.success) {
        setUsdaNutrition(result);
        setNutritionSource('usda');

        const successRate = Math.round(result.coverage);
        if (result.failedIngredients.length > 0) {
          toast.success(
            `Enhanced with USDA data! ${successRate}% ingredient coverage.\n` +
            `Couldn't match: ${result.failedIngredients.slice(0, 3).join(', ')}${result.failedIngredients.length > 3 ? '...' : ''}`,
            { duration: 5000 }
          );
        } else {
          toast.success(`✅ 100% ingredient coverage with USDA nutritional data!`);
        }
      } else {
        toast.error(result.error || 'Failed to enrich with USDA data');
      }
    } catch (error) {
      console.error('USDA enrichment error:', error);
      toast.error('Failed to enrich recipe with USDA data');
    } finally {
      setIsEnriching(false);
      setEnrichmentProgress(null);
    }
  };

// Find this function in your page.js and replace it with this version
  const handleAddApiRecipe = async (apiRecipe) => {
    try {
      // Parse ingredients from API format
      const ingredients = apiRecipe.extendedIngredients?.map(ing => ({
        name: ing.name || ing.original,
        amount: ing.measures?.us?.amount && ing.measures?.us?.unitShort
          ? `${ing.measures.us.amount} ${ing.measures.us.unitShort}`
          : ing.amount || '',
        category: ing.aisle?.toLowerCase().includes('produce') ? 'produce'
          : ing.aisle?.toLowerCase().includes('meat') ? 'meat'
          : ing.aisle?.toLowerCase().includes('dairy') ? 'dairy'
          : 'other'
      })) || [];

      // Parse instructions
      let instructions = '';
      if (apiRecipe.analyzedInstructions?.[0]?.steps) {
        instructions = apiRecipe.analyzedInstructions[0].steps
          .map((step, i) => `${i + 1}. ${step.step}`)
          .join('\n\n');
      } else if (apiRecipe.instructions) {
        instructions = apiRecipe.instructions;
      }

      await addRecipe({
        name: apiRecipe.title,
        description: apiRecipe.summary?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
        servings: `${apiRecipe.servings || ''} servings`,
        prepTime: `${apiRecipe.readyInMinutes || ''} mins`,
        ingredients,
        instructions,
        imageUrl: apiRecipe.image,
        nutrition: apiRecipe.nutrition,
        // --- THIS IS THE FIX: Restored sourceUrl ---
        sourceUrl: apiRecipe.sourceUrl,
      });

      toast.success(`Added ${apiRecipe.title} to your recipes!`);
      setSelectedSearchRecipe(null);
      setActiveTab('my-recipes');
    } catch (error) {
      console.error('Error adding recipe:', error);
      toast.error('Failed to add recipe');
    }
  };

  const handleAddIngredient = () => {
    setNewRecipe({
      ...newRecipe,
      ingredients: [...newRecipe.ingredients, { name: '', amount: '', category: 'other' }],
    });
  };

  const handleRemoveIngredient = (index) => {
    setNewRecipe({
      ...newRecipe,
      ingredients: newRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...newRecipe.ingredients];
    updated[index][field] = value;
    setNewRecipe({ ...newRecipe, ingredients: updated });
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setNewRecipe({ ...newRecipe, imageFile: e.target.files[0] });
    }
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = '';

      // Upload image if provided
      if (newRecipe.imageFile) {
        const timestamp = Date.now();
        const storageRef = ref(
          storage,
          `families/${userData.familyId}/recipes/${timestamp}_${newRecipe.imageFile.name}`
        );
        await uploadBytes(storageRef, newRecipe.imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      await addRecipe({
        name: newRecipe.name,
        description: newRecipe.description,
        servings: newRecipe.servings,
        prepTime: newRecipe.prepTime,
        ingredients: newRecipe.ingredients.filter(ing => ing.name),
        instructions: newRecipe.instructions,
        imageUrl,
      });

      setNewRecipe({
        name: '',
        description: '',
        servings: '',
        prepTime: '',
        ingredients: [{ name: '', amount: '', category: 'other' }],
        instructions: '',
        imageFile: null,
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding recipe:', error);
      toast.error('Failed to add recipe');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveScannedRecipe = async (scannedRecipe, imageFile) => {
    setUploading(true);
    try {
      let imageUrl = '';

      // Upload the scanned image if provided
      if (imageFile) {
        const timestamp = Date.now();
        const storageRef = ref(
          storage,
          `families/${userData.familyId}/recipes/${timestamp}_${imageFile.name}`
        );
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Combine prep and cook time if both exist
      let totalTime = '';
      if (scannedRecipe.prepTime && scannedRecipe.cookTime) {
        totalTime = `Prep: ${scannedRecipe.prepTime}, Cook: ${scannedRecipe.cookTime}`;
      } else {
        totalTime = scannedRecipe.prepTime || scannedRecipe.cookTime || '';
      }

      await addRecipe({
        name: scannedRecipe.name,
        description: scannedRecipe.description || 'Scanned recipe',
        servings: scannedRecipe.servings,
        prepTime: totalTime,
        ingredients: scannedRecipe.ingredients.filter(ing => ing.name),
        instructions: scannedRecipe.instructions,
        imageUrl,
      });

      toast.success(`Successfully added "${scannedRecipe.name}" to your recipes! 📖`);
      setActiveTab('my-recipes');
    } catch (error) {
      console.error('Error saving scanned recipe:', error);
      toast.error('Failed to save recipe');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const addAllToGroceries = async (recipe) => {
    for (const ing of recipe.ingredients || []) {
      await addGroceryItem({
        name: ing.name,
        quantity: ing.amount,
        category: ing.category || 'other',
      });
    }
    toast.success(`Added ${recipe.name} ingredients to grocery list! 🛒`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🍳</div>
          <p className="text-xl font-bold text-purple-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Potion Recipes' : 'Family Recipes'}
              </span>
            </h1>
            <p className={`${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-semibold`}>
              {recipes.length} {currentTheme === 'dark' ? 'potions' : 'saved recipes'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowScanModal(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              aria-label="Scan Recipe"
            >
              <FaCamera /> <span className="hidden md:inline">Scan Recipe</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              aria-label={currentTheme === 'dark' ? 'Add Potion' : 'Add Recipe'}
            >
              <FaPlus /> <span className="hidden md:inline">{currentTheme === 'dark' ? 'Add Potion' : 'Add Recipe'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search recipes..."
              className="flex-1 px-4 md:px-6 py-3 md:py-4 rounded-2xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold text-base md:text-lg shadow-lg"
              required
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
              aria-label="Search"
            >
              {searching ? <span className="md:hidden">...</span> : <FaSearch />}
              <span className="hidden md:inline">{searching ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
          <p className="mt-2 text-xs md:text-sm text-gray-600 font-semibold">
            🍳 Search thousands of recipes with photos and instructions.
          </p>
        </form>

        {/* Tabs */}
        {searchResults.length > 0 && (
          <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 mb-6">
            <div className="flex gap-2 min-w-min">
              <button
                onClick={() => setActiveTab('my-recipes')}
                className={`px-4 md:px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
                  activeTab === 'my-recipes'
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                My Recipes ({recipes.length})
              </button>
              <button
                onClick={() => setActiveTab('search-results')}
                className={`px-4 md:px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${
                  activeTab === 'search-results'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Search Results ({searchResults.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* My Recipes Tab */}
      {activeTab === 'my-recipes' && (
        <>
          {recipes.length === 0 ? (
            <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
              <div className="text-6xl mb-4">🍳</div>
              <p className={`text-xl font-bold ${theme.colors.textMuted}`}>No recipes yet</p>
              <p className={theme.colors.textMuted}>Add your family's favorite recipes or search for new ones!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map(recipe => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`${theme.colors.bgCard} rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  {recipe.imageUrl ? (
                    <div className="relative h-48">
                      <Image
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
                      <span className="text-6xl">🍳</span>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{recipe.name}</h3>
                    {recipe.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      {recipe.servings && <span>👥 {recipe.servings}</span>}
                      {recipe.prepTime && <span>⏱️ {recipe.prepTime}</span>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addAllToGroceries(recipe);
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1"
                      >
                        <FaShoppingCart /> Add to List
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${recipe.name}"?`)) {
                            deleteRecipe(recipe.id);
                          }
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-all flex items-center justify-center"
                        title="Delete recipe"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Search Results Tab */}
      {activeTab === 'search-results' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map(recipe => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${theme.colors.bgCard} border-2 border-blue-200 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-purple-400 transition-all cursor-pointer`}
              onClick={() => handleViewRecipeDetails(recipe.id)}
            >
              {recipe.image ? (
                <div className="relative h-48">
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                  <span className="text-6xl">🍽️</span>
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                  {recipe.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  {recipe.readyInMinutes && <span>⏱️ {recipe.readyInMinutes} mins</span>}
                  {recipe.servings && <span>👥 {recipe.servings}</span>}
                </div>
                <button
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg"
                >
                  View Details & Add
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Recipe Detail Modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setSelectedRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl max-w-2xl w-full shadow-2xl my-4 md:my-8 max-h-[95vh] overflow-y-auto`}
            >
              {selectedRecipe.imageUrl && (
                <div className="relative h-64">
                  <Image
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.name}
                    fill
                    className="object-cover rounded-t-3xl"
                    unoptimized
                  />
                </div>
              )}

              <div className="p-4 md:p-8">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-3xl font-display font-bold gradient-text">
                    {selectedRecipe.name}
                  </h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this recipe?')) {
                        deleteRecipe(selectedRecipe.id);
                        setSelectedRecipe(null);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    <FaTrash />
                  </button>
                </div>

                {selectedRecipe.description && (
                  <p className="text-gray-600 mb-4">{selectedRecipe.description}</p>
                )}

                <div className="flex gap-4 mb-6">
                  {selectedRecipe.servings && (
                    <div className="bg-purple-50 px-4 py-2 rounded-xl">
                      <span className="font-bold text-purple-700">👥 {selectedRecipe.servings}</span>
                    </div>
                  )}
                  {selectedRecipe.prepTime && (
                    <div className="bg-blue-50 px-4 py-2 rounded-xl">
                      <span className="font-bold text-blue-700">⏱️ {selectedRecipe.prepTime}</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-3">📝 Ingredients:</h3>
                  <div className="space-y-2">
                    {selectedRecipe.ingredients?.map((ing, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <span className="font-semibold text-gray-800">{ing.name}</span>
                        {ing.amount && <span className="text-gray-600">- {ing.amount}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRecipe.instructions && (
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-3">👨‍🍳 Instructions:</h3>
                    <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-xl">
                      {selectedRecipe.instructions}
                    </p>
                  </div>
                )}
                {/* --- ADDED: Watch Video Button (only if URL exists) --- */}
                {selectedRecipe.videoUrl && (
                  <button
                    onClick={() => {
                      const videoId = getYouTubeId(selectedRecipe.videoUrl);
                      if (videoId) {
                        setVideoToPlay(videoId);
                      } else {
                        toast.error("Invalid YouTube URL");
                      }
                    }}
                    className="w-full mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-2xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <FaYoutube size={20} /> Watch Video Tutorial
                  </button>
                )}
                <button
                  onClick={() => {
                    addAllToGroceries(selectedRecipe);
                    setSelectedRecipe(null);
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-4 rounded-2xl font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <FaShoppingCart /> Add All Ingredients to Grocery List
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Recipe Modal - Simplified for space */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => !uploading && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-2xl w-full shadow-2xl my-4 md:my-8 max-h-[95vh] overflow-y-auto`}
            >
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 md:mb-6 gradient-text">
                🍳 Add Recipe
              </h2>

              <form onSubmit={handleAddRecipe} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      Recipe Name
                    </label>
                    <input
                      type="text"
                      value={newRecipe.name}
                      onChange={(e) => setNewRecipe({ ...newRecipe, name: e.target.value })}
                      placeholder="Spaghetti Carbonara"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      Servings
                    </label>
                    <input
                      type="text"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({ ...newRecipe, servings: e.target.value })}
                      placeholder="4 servings"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      Prep Time
                    </label>
                    <input
                      type="text"
                      value={newRecipe.prepTime}
                      onChange={(e) => setNewRecipe({ ...newRecipe, prepTime: e.target.value })}
                      placeholder="30 mins"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Ingredients
                  </label>
                  {newRecipe.ingredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                        placeholder="Ingredient"
                        className="flex-1 px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={ing.amount}
                        onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        className="w-32 px-4 py-2 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        className="px-3 text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-sm text-purple-600 font-bold hover:underline"
                  >
                    + Add Ingredient
                  </button>
                </div>
                  {/* --- ADDED: Video URL Input --- */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2 flex items-center gap-2`}>
                    <FaYoutube className="text-red-500" /> YouTube Video URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={newRecipe.videoUrl}
                    onChange={(e) => setNewRecipe({ ...newRecipe, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Instructions
                  </label>
                  <textarea
                    value={newRecipe.instructions}
                    onChange={(e) => setNewRecipe({ ...newRecipe, instructions: e.target.value })}
                    placeholder="Step-by-step instructions..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {uploading ? 'Adding...' : 'Add Recipe'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Search Recipe Detail Modal */}
      <AnimatePresence>
        {selectedSearchRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setSelectedSearchRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-5xl w-full shadow-2xl my-4 md:my-8 max-h-[95vh] overflow-y-auto`}
            >
              {loadingRecipeDetails ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">🍳</div>
                    <p className="text-xl font-bold text-purple-600">Loading recipe details...</p>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedSearchRecipe(null)}
                    className="mb-4 text-purple-600 font-bold hover:text-purple-800 flex items-center gap-2"
                  >
                    ← Back to results
                  </button>

                  {selectedSearchRecipe.image && (
                    <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-4 md:mb-6">
                      <Image
                        src={selectedSearchRecipe.image}
                        alt={selectedSearchRecipe.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}

                  <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 gradient-text">
                    {selectedSearchRecipe.title}
                  </h2>

                  {/* Recipe Info Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
                    {selectedSearchRecipe.readyInMinutes && (
                      <div className="bg-blue-50 p-3 md:p-4 rounded-xl text-center">
                        <div className="text-xl md:text-2xl mb-1">⏱️</div>
                        <div className="text-xs md:text-sm font-bold text-blue-900">{selectedSearchRecipe.readyInMinutes} mins</div>
                      </div>
                    )}
                    {selectedSearchRecipe.servings && (
                      <div className="bg-purple-50 p-3 md:p-4 rounded-xl text-center">
                        <div className="text-xl md:text-2xl mb-1">👥</div>
                        <div className="text-xs md:text-sm font-bold text-purple-900">{selectedSearchRecipe.servings} servings</div>
                      </div>
                    )}
                    {selectedSearchRecipe.healthScore && (
                      <div className="bg-green-50 p-3 md:p-4 rounded-xl text-center">
                        <div className="text-xl md:text-2xl mb-1">💚</div>
                        <div className="text-xs md:text-sm font-bold text-green-900">Health: {selectedSearchRecipe.healthScore}/100</div>
                      </div>
                    )}
                    {selectedSearchRecipe.pricePerServing && (
                      <div className="bg-orange-50 p-3 md:p-4 rounded-xl text-center">
                        <div className="text-xl md:text-2xl mb-1">💰</div>
                        <div className="text-xs md:text-sm font-bold text-orange-900">${(selectedSearchRecipe.pricePerServing / 100).toFixed(2)}/serving</div>
                      </div>
                    )}
                  </div>

                  {/* Nutrition Info */}
                  {selectedSearchRecipe.nutrition && (
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-6 rounded-2xl mb-4 md:mb-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <h3 className="text-lg md:text-xl font-bold flex items-center gap-2">
                          <span>📊</span> Nutrition Facts
                          {usdaNutrition && (
                            <span className="text-sm font-normal text-green-600">
                              ({nutritionSource === 'usda' ? 'USDA Enhanced' : 'Spoonacular'})
                            </span>
                          )}
                        </h3>

                        {/* USDA Enrichment Button */}
                        {!isEnriching && !usdaNutrition && selectedSearchRecipe.extendedIngredients?.length > 0 && (
                          <button
                            onClick={() => handleEnrichWithUSDA(selectedSearchRecipe)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 md:px-4 py-2 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg text-xs md:text-sm flex items-center justify-center gap-2 w-full md:w-auto"
                          >
                            🥗 <span className="hidden sm:inline">Enhance with</span> USDA
                          </button>
                        )}

                        {/* Toggle between sources */}
                        {usdaNutrition && !isEnriching && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setNutritionSource('spoonacular')}
                              className={`px-3 py-1 rounded-lg font-bold text-sm transition-all ${
                                nutritionSource === 'spoonacular'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Spoonacular
                            </button>
                            <button
                              onClick={() => setNutritionSource('usda')}
                              className={`px-3 py-1 rounded-lg font-bold text-sm transition-all ${
                                nutritionSource === 'usda'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              USDA
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Enrichment Progress */}
                      {isEnriching && enrichmentProgress && (
                        <div className="mb-4 p-4 bg-white rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-700">
                              Looking up ingredients in USDA database...
                            </span>
                            <span className="text-sm font-bold text-green-600">
                              {enrichmentProgress.current} / {enrichmentProgress.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-600">
                            Current: {enrichmentProgress.ingredient}
                          </p>
                        </div>
                      )}

                      {/* Display nutrition data */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        {(nutritionSource === 'usda' && usdaNutrition
                          ? usdaNutrition.totalNutrition.nutrients
                          : selectedSearchRecipe.nutrition.nutrients
                        )?.slice(0, 12).map((nutrient, i) => (
                          <div key={i} className="bg-white p-2 md:p-3 rounded-xl">
                            <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                              {nutritionSource === 'usda' ? formatNutrientName(nutrient.name) : nutrient.name}
                            </div>
                            <div className="text-base md:text-lg font-bold text-gray-900">
                              {(nutrient.amount ? nutrient.amount.toFixed(1) : 'N/A')}{nutrient.unit}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* USDA Coverage Info */}
                      {usdaNutrition && nutritionSource === 'usda' && (
                        <div className="mt-4 p-3 bg-green-100 rounded-xl">
                          <p className="text-sm text-green-800">
                            <strong>✅ {Math.round(usdaNutrition.coverage)}% ingredient coverage</strong>
                            {usdaNutrition.failedIngredients.length > 0 && (
                              <span className="block mt-1 text-xs">
                                Couldn't match: {usdaNutrition.failedIngredients.join(', ')}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ingredients */}
                  {selectedSearchRecipe.extendedIngredients && (
                    <div className="mb-4 md:mb-6">
                      <h3 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2">
                        <span>📝</span> Ingredients ({selectedSearchRecipe.extendedIngredients.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedSearchRecipe.extendedIngredients.map((ing, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <span className="text-gray-700">{ing.original}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {selectedSearchRecipe.analyzedInstructions?.[0]?.steps && (
                    <div className="mb-4 md:mb-6">
                      <h3 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2">
                        <span>👨‍🍳</span> Instructions
                      </h3>
                      <div className="space-y-3">
                        {selectedSearchRecipe.analyzedInstructions[0].steps.map((step, i) => (
                          <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                              {step.number}
                            </div>
                            <p className="text-gray-700 flex-1">{step.step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAddApiRecipe(selectedSearchRecipe)}
                      className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 md:py-4 rounded-2xl font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      <FaPlus /> Add to My Recipes
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Scanner Modal */}
      <RecipeScannerModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onSaveRecipe={handleSaveScannedRecipe}
      />
    </>
  );
}

export default function RecipesPage() {
  return (
    <DashboardLayout>
      <RecipesContent />
    </DashboardLayout>
  );
}












