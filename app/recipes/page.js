'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRecipes, useGroceries } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { searchRecipes, getRecipeInformation, getRecipeNutrition } from '@/lib/spoonacular';
import { enrichRecipeWithUSDA, formatNutrientName } from '@/lib/usdaEnrichment';
import { fetchFoodImageFallback } from '@/lib/imageFallback';
import { FaPlus, FaTrash, FaShoppingCart, FaSearch, FaCamera, FaYoutube, FaTimes } from 'react-icons/fa';
import RecipeScannerModal from '@/components/RecipeScannerModal';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import Image from 'next/image';
const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const DEFAULT_RECIPE_IMAGE = 'https://source.unsplash.com/600x400/?home-cooked-meal';

// Light-weight category inference to keep groceries out of "Other"
function inferCategory(name = '', aisle = '') {
  const text = `${name} ${aisle}`.toLowerCase();
  const has = (keywords) => keywords.some((k) => text.includes(k));

  if (has(['produce', 'vegetable', 'fruit', 'leaf', 'greens'])) return 'produce';
  if (has(['meat', 'beef', 'pork', 'chicken', 'turkey', 'seafood', 'fish', 'shrimp'])) return 'meat';
  if (has(['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream'])) return 'dairy';
  if (has(['frozen'])) return 'frozen';
  if (has(['bakery', 'bread', 'bun', 'bagel', 'tortilla'])) return 'bakery';
  if (has(['snack', 'chips', 'cracker', 'candy'])) return 'snacks';
  if (has(['beverage', 'drink', 'juice', 'soda', 'coffee', 'tea'])) return 'beverages';
  if (has(['spice', 'seasoning', 'herb', 'condiment', 'sauce', 'oil', 'vinegar', 'stock', 'broth', 'bouillon'])) return 'condiments';
  if (has(['rice', 'pasta', 'grain', 'flour', 'sugar', 'salt', 'beans', 'lentil'])) return 'pantry';
  return 'other';
}

const CATEGORIES = {
  produce: { name: 'Produce', icon: "🥬", color: "from-green-400 to-green-500" },
  dairy: { name: 'Dairy', icon: "🥛", color: "from-blue-400 to-blue-500" },
  meat: { name: 'Meat & Seafood', icon: "🍖", color: "from-red-400 to-red-500" },
  frozen: { name: 'Frozen', icon: "🧊", color: "from-cyan-400 to-cyan-500" },
  pantry: { name: 'Pantry', icon: "🥞", color: "from-yellow-400 to-yellow-500" },
  bakery: { name: 'Bakery', icon: "🥐", color: "from-orange-400 to-orange-500" },
  snacks: { name: 'Snacks', icon: "🍿", color: "from-purple-400 to-purple-500" },
  beverages: { name: 'Beverages', icon: "🥤", color: "from-pink-400 to-pink-500" },
  condiments: { name: 'Condiments & Spices', icon: "🧂", color: "from-amber-400 to-red-500" },
  other: { name: 'Other', icon: "📦", color: "from-gray-400 to-gray-500" },
};

function RecipesContent() {
  const { recipes, loading, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
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
  const [timeLimit, setTimeLimit] = useState(null);
  const [detailImageUrl, setDetailImageUrl] = useState('');
  const [usdaNutrition, setUsdaNutrition] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(null);
  const [nutritionSource, setNutritionSource] = useState('spoonacular'); // 'spoonacular' or 'usda'
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    description: '',
    servings: '',
    prepTime: '',
    cookTime: '',
    ingredients: [{ name: '', amount: '', category: 'other' }],
    instructions: '',
    imageFile: null,
    imageUrl: '',
    videoUrl: '',
    sourceType: 'manual', // manual | search | scanned
  });

  // Decide which nutrients to show (per serving) depending on the selected source.
  const isUsdaSource = nutritionSource === 'usda';
  const displayNutrients =
    isUsdaSource && usdaNutrition?.totalNutrition
      ? usdaNutrition.totalNutrition.nutrients || usdaNutrition.totalNutrition.totals || []
      : selectedSearchRecipe?.nutrition?.nutrients || [];
  const displayTotals = isUsdaSource && usdaNutrition?.totalNutrition?.totals
    ? usdaNutrition.totalNutrition.totals
    : [];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchRecipes(searchQuery, timeLimit || null);
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
            `Couldn&apos;t match: ${result.failedIngredients.slice(0, 3).join(', ')}${result.failedIngredients.length > 3 ? '...' : ''}`,
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
        category: inferCategory(ing.name || ing.original, ing.aisle),
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
        cookTime: apiRecipe.cookTime || '',
        ingredients,
        instructions,
        imageUrl: apiRecipe.image,
        nutrition: apiRecipe.nutrition,
        // --- THIS IS THE FIX: Restored sourceUrl ---
        sourceUrl: apiRecipe.sourceUrl,
        sourceType: 'search',
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
      let imageUrl = editingRecipeId
        ? recipes.find(r => r.id === editingRecipeId)?.imageUrl || ''
        : '';
      let displayImageUrl = editingRecipeId
        ? recipes.find(r => r.id === editingRecipeId)?.displayImageUrl || ''
        : '';

      // Upload image if provided
      if (newRecipe.imageFile) {
        const timestamp = Date.now();
        const storageRef = ref(
          storage,
          `families/${userData.familyId}/recipes/${timestamp}_${newRecipe.imageFile.name}`
        );
        await uploadBytes(storageRef, newRecipe.imageFile);
        imageUrl = await getDownloadURL(storageRef);
      } else if (newRecipe.imageUrl) {
        // Use provided URL when no new file is uploaded
        imageUrl = newRecipe.imageUrl;
      }
      // If user provided a display image URL, prefer it for showing (but keep the stored imageUrl for uploads)
      if (newRecipe.imageUrl) {
        displayImageUrl = newRecipe.imageUrl;
      }

      const payload = {
        name: newRecipe.name,
        description: newRecipe.description,
        servings: newRecipe.servings,
        prepTime: newRecipe.prepTime,
        cookTime: newRecipe.cookTime,
        ingredients: newRecipe.ingredients
          .filter(ing => ing.name)
          .map(ing => ({
            ...ing,
            category: ing.category || inferCategory(ing.name, ''),
          })),
        instructions: newRecipe.instructions,
        imageUrl,
        displayImageUrl,
        videoUrl: newRecipe.videoUrl || '',
        sourceType: (newRecipe.sourceType === 'manual' && newRecipe.imageFile) ? 'uploaded' : newRecipe.sourceType || (newRecipe.imageFile ? 'uploaded' : 'manual'),
      };

      if (editingRecipeId) {
        await updateRecipe(editingRecipeId, { ...payload });
      } else {
        await addRecipe({ ...payload });
      }

      setNewRecipe({
        name: '',
        description: '',
        servings: '',
        prepTime: '',
        cookTime: '',
        ingredients: [{ name: '', amount: '', category: 'other' }],
        instructions: '',
        imageFile: null,
        videoUrl: '',
        sourceType: 'manual',
      });
      setShowAddModal(false);
      setEditingRecipeId(null);
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
      let displayImageUrl = '';

      // Upload the scanned image if provided
      if (imageFile) {
        try {
          const timestamp = Date.now();
          const storageRef = ref(
            storage,
            `families/${userData.familyId}/recipes/${timestamp}_${imageFile.name}`
          );
          await uploadBytes(storageRef, imageFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (err) {
          console.warn('Image upload failed, will try fallback:', err);
        }
      }

      // Fetch a stock fallback based on the recipe name (always; use it for display preference)
      const fallback = await fetchFoodImageFallback(scannedRecipe.name);
      if (!imageUrl && fallback) {
        imageUrl = fallback;
      }
      displayImageUrl = fallback || imageUrl;

      // Combine prep and cook time if both exist
      const ingredientsWithCategory = scannedRecipe.ingredients
        .filter(ing => ing.name)
        .map(ing => ({
          ...ing,
          category: ing.category || inferCategory(ing.name, ''),
        }));

      await addRecipe({
        name: scannedRecipe.name,
        description: scannedRecipe.description || '',
        servings: scannedRecipe.servings,
        prepTime: scannedRecipe.prepTime || '',
        cookTime: scannedRecipe.cookTime || '',
        ingredients: ingredientsWithCategory,
        instructions: scannedRecipe.instructions,
        imageUrl,
        displayImageUrl,
        sourceType: 'scanned',
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

  const startEditingRecipe = (recipe) => {
    setEditingRecipeId(recipe.id);
    setNewRecipe({
      name: recipe.name || '',
      description: recipe.description || '',
      servings: recipe.servings || '',
      prepTime: recipe.prepTime || '',
      ingredients: recipe.ingredients?.length
        ? recipe.ingredients.map((ing) => ({
            name: ing.name || '',
            amount: ing.amount || '',
            category: ing.category || 'other',
          }))
        : [{ name: '', amount: '', category: 'other' }],
      instructions: recipe.instructions || '',
      imageFile: null,
      imageUrl: recipe.imageUrl || '',
      displayImageUrl: recipe.displayImageUrl || '',
      videoUrl: recipe.videoUrl || '',
      cookTime: recipe.cookTime || '',
      sourceType: recipe.sourceType || 'manual',
    });
    setShowAddModal(true);
  };

  // Ensure the detail modal has an image; if none stored, fetch a fallback.
  useEffect(() => {
    let isMounted = true;
    async function ensureDetailImage() {
      if (!selectedRecipe) {
        if (isMounted) setDetailImageUrl('');
        return;
      }
      if (selectedRecipe.displayImageUrl || selectedRecipe.imageUrl) {
        if (isMounted) setDetailImageUrl(selectedRecipe.displayImageUrl || selectedRecipe.imageUrl);
        return;
      }
      const fallback = await fetchFoodImageFallback(selectedRecipe.name || 'recipe');
      if (isMounted && fallback) {
        setDetailImageUrl(fallback);
      } else if (isMounted) {
        setDetailImageUrl(DEFAULT_RECIPE_IMAGE);
      }
    }
    ensureDetailImage();
    return () => {
      isMounted = false;
    };
  }, [selectedRecipe]);

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
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
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
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch">
            <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search recipes..."
              className={`w-full px-4 md:px-5 py-3 md:py-3.5 rounded-2xl border-2 font-semibold text-base md:text-lg shadow-sm transition-colors pr-10 ${
                currentTheme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-purple-500 hover:border-purple-400'
                  : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 hover:border-purple-300'
              } focus:outline-none`}
              required
            />
            {searchQuery && (
                <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                    <FaTimes />
                </button>
            )}
            </div>
            <div className="flex gap-2">
              <select
                value={timeLimit ?? ''}
                onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : null)}
                className={`px-3 py-3 md:py-3.5 rounded-2xl border-2 font-semibold text-sm md:text-base shadow-sm transition-colors ${
                  currentTheme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-purple-500'
                    : 'bg-white/80 border-gray-200 text-gray-900 focus:border-purple-500'
                }`}
              >
                <option value="">Any time</option>
                <option value="15">≤ 15 min</option>
                <option value="30">≤ 30 min</option>
                <option value="45">≤ 45 min</option>
                <option value="60">≤ 60 min</option>
              </select>
              <button
                type="submit"
                disabled={searching}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 md:px-6 py-3 md:py-3.5 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 justify-center"
                aria-label="Search"
              >
                {searching ? <span className="md:hidden">...</span> : <FaSearch />}
                <span className="hidden md:inline">{searching ? 'Searching...' : 'Search'}</span>
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400 font-semibold">
            🍳 Search thousands of recipes with photos and instructions.
          </p>
        </form>

        {/* Tabs */}
        {searchResults.length > 0 && (
          <div className="mb-6 flex items-center gap-3 overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setActiveTab('my-recipes')}
                className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 transition-all shadow-sm whitespace-nowrap text-sm md:text-base ${
                  activeTab === 'my-recipes'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                }`}
              >
                My Recipes ({recipes.length})
              </button>
              <button
                onClick={() => setActiveTab('search-results')}
                className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-3 rounded-full border-2 transition-all shadow-sm whitespace-nowrap text-sm md:text-base ${
                  activeTab === 'search-results'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-dashed border-gray-300 bg-white text-gray-700 hover:border-blue-300'
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
              <p className={theme.colors.textMuted}>Add your family&apos;s favorite recipes or search for new ones!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map(recipe => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`${theme.colors.bgCard} rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all cursor-pointer group relative`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="relative h-48">
                    <Image
                      src={
                        recipe.displayImageUrl ||
                        recipe.imageUrl ||
                        (recipe.name
                          ? `https://source.unsplash.com/600x400/?food,${encodeURIComponent(recipe.name)}`
                          : DEFAULT_RECIPE_IMAGE)
                      }
                      alt={recipe.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="p-6 relative">
                    <h3 className={`text-xl font-bold mb-2 ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>{recipe.name}</h3>
                    {recipe.description && recipe.description.toLowerCase() !== 'scanned recipe' && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
                      {recipe.sourceType === 'scanned' && (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-bold text-xs">
                          Scanned Recipe
                        </span>
                      )}
                      {recipe.sourceType === 'search' && (
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-xs">
                          Added from Search
                        </span>
                      )}
                      {recipe.sourceType === 'uploaded' && (
                        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-bold text-xs">
                          Uploaded Recipe
                        </span>
                      )}
                      {(!recipe.sourceType || recipe.sourceType === 'manual') && (
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold text-xs">
                          Added Recipe
                        </span>
                      )}
                      {recipe.servings && <span>👥 {recipe.servings}</span>}
                      {recipe.prepTime && <span>⏱️ Prep {recipe.prepTime}</span>}
                      {recipe.cookTime && <span>🍳 Cook {recipe.cookTime}</span>}
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
                      className="text-red-600 p-2 rounded-xl transition-all flex items-center justify-center font-bold hover:text-red-700"
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
                <h3 className={`text-xl font-bold mb-2 line-clamp-2 ${currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col border ${theme.colors.borderLight}`}
            >
              {detailImageUrl ? (
                <div className="relative h-64">
                  <Image
                    src={detailImageUrl}
                    alt={selectedRecipe.name}
                    fill
                    className="object-cover rounded-t-3xl"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              ) : (
                <div className="h-64 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center rounded-t-3xl">
                  <span className="text-5xl">??</span>
                </div>
              )}

              <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className={`text-3xl font-bold ${theme.colors.text}`}>{selectedRecipe.name}</h2>
                    {selectedRecipe.description &&
                      selectedRecipe.description.toLowerCase() !== 'scanned recipe' && (
                        <p className={`${theme.colors.textMuted} mt-2`}>{selectedRecipe.description}</p>
                    )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    deleteRecipe(selectedRecipe.id);
                    setSelectedRecipe(null);
                  }}
                      className="text-red-500 px-3 py-2 rounded-full font-bold hover:text-red-600"
                      title="Delete recipe"
                >
                  <FaTrash />
                </button>
                <button
                  onClick={() => {
                    startEditingRecipe(selectedRecipe);
                  }}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-full font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                  title="Edit recipe"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className={`${theme.colors.bgSecondary} ${theme.colors.text} px-3 py-2 rounded-full font-bold hover:opacity-80 transition-all`}
                  title="Close"
                >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm mb-6">
                  {selectedRecipe.servings && (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                      👥 {selectedRecipe.servings}
                    </span>
                  )}
                  {selectedRecipe.prepTime && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                      ⏱️ {selectedRecipe.prepTime}
                    </span>
                  )}
                  {selectedRecipe.cookTime && (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold">
                      🍳 {selectedRecipe.cookTime}
                    </span>
                  )}
                </div>

                <h3 className={`text-xl font-bold ${theme.colors.text} mb-2`}>Ingredients</h3>
                <div className="space-y-2 mb-6">
                  {selectedRecipe.ingredients?.map((ing, i) => (
                    <div key={i} className={`flex items-center gap-2 ${theme.colors.text}`}>
                      <span className="text-purple-500 dark:text-purple-400 font-bold">•</span>
                      <span>
                        {ing.amount && `${ing.amount} `}
                        {ing.name}
                      </span>
                    </div>
                  ))}
                </div>

                {selectedRecipe.instructions && (
                  <>
                    <h3 className={`text-xl font-bold ${theme.colors.text} mb-2`}>Instructions</h3>
                    <p className={`${theme.colors.text} whitespace-pre-line mb-6`}>
                      {selectedRecipe.instructions}
                    </p>
                  </>
                )}

                {selectedRecipe.videoUrl && (
                  <div className="mt-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Video</h3>
                    <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
                      {(() => {
                        const videoId = getYouTubeId(selectedRecipe.videoUrl);
                        if (videoId) {
                          return (
                            <iframe
                              src={`https://www.youtube.com/embed/${videoId}`}
                              title="YouTube video player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            ></iframe>
                          );
                        }
                        return (
                          <a
                            href={selectedRecipe.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`block w-full h-full ${theme.colors.bgSecondary} flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold`}
                          >
                            Open Video
                          </a>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="mt-6">
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => {
              if (uploading) return;
              setShowAddModal(false);
              setEditingRecipeId(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-2xl w-full shadow-2xl my-4 md:my-8 max-h-[95vh] overflow-y-auto border ${theme.colors.border}`}
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">
                  🍳 {editingRecipeId ? 'Edit Recipe' : 'Add Recipe'}
                </h2>
                <button
                  onClick={() => {
                    if (uploading) return;
                    setShowAddModal(false);
                    setEditingRecipeId(null);
                  }}
                  className={`${theme.colors.textMuted} hover:${theme.colors.text} p-2 rounded-full hover:opacity-80 transition-colors`}
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

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
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
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
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
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
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
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
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      Cook Time
                    </label>
                    <input
                      type="text"
                      value={newRecipe.cookTime}
                      onChange={(e) => setNewRecipe({ ...newRecipe, cookTime: e.target.value })}
                      placeholder="45 mins"
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Ingredients
                  </label>
                  {newRecipe.ingredients.map((ing, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 items-center">
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                        placeholder="Ingredient"
                        className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                      />
                      <input
                        type="text"
                        value={ing.amount}
                        onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                        placeholder="Amount"
                        className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={ing.category}
                          onChange={(e) => handleIngredientChange(index, 'category', e.target.value)}
                          className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                        >
                          {Object.entries(CATEGORIES).map(([key, cat]) => (
                            <option key={key} value={key}>{cat.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          className="px-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
                      </div>
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
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
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
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 ${theme.colors.bgSecondary} ${theme.colors.text} py-3 rounded-xl font-bold hover:opacity-80 transition-all`}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {uploading ? (editingRecipeId ? 'Updating...' : 'Saving...') : editingRecipeId ? 'Update Recipe' : 'Add Recipe'}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setSelectedSearchRecipe(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-5xl w-full shadow-2xl my-4 md:my-8 max-h-[95vh] overflow-y-auto border ${theme.colors.border}`}
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

                  <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden mb-4 md:mb-6">
                    <Image
                      src={
                        selectedSearchRecipe.image ||
                        selectedSearchRecipe.imageUrl ||
                        DEFAULT_RECIPE_IMAGE
                      }
                      alt={selectedSearchRecipe.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 gradient-text">
                    {selectedSearchRecipe.title}
                  </h2>

                  {/* Recipe Info Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
                    {selectedSearchRecipe.readyInMinutes && (
                      <div className={`${theme.colors.bgSecondary} p-3 md:p-4 rounded-xl text-center`}>
                        <div className="text-xl md:text-2xl mb-1">⏱️</div>
                        <div className={`text-xs md:text-sm font-bold ${theme.colors.text}`}>{selectedSearchRecipe.readyInMinutes} mins</div>
                      </div>
                    )}
                    {selectedSearchRecipe.servings && (
                      <div className={`${theme.colors.bgSecondary} p-3 md:p-4 rounded-xl text-center`}>
                        <div className="text-xl md:text-2xl mb-1">👥</div>
                        <div className={`text-xs md:text-sm font-bold ${theme.colors.text}`}>{selectedSearchRecipe.servings} servings</div>
                      </div>
                    )}
                    {selectedSearchRecipe.healthScore && (
                      <div className={`${theme.colors.bgSecondary} p-3 md:p-4 rounded-xl text-center`}>
                        <div className="text-xl md:text-2xl mb-1">💚</div>
                        <div className={`text-xs md:text-sm font-bold ${theme.colors.text}`}>Health: {selectedSearchRecipe.healthScore}/100</div>
                      </div>
                    )}
                    {selectedSearchRecipe.pricePerServing && (
                      <div className={`${theme.colors.bgSecondary} p-3 md:p-4 rounded-xl text-center`}>
                        <div className="text-xl md:text-2xl mb-1">💰</div>
                        <div className={`text-xs md:text-sm font-bold ${theme.colors.text}`}>${(selectedSearchRecipe.pricePerServing / 100).toFixed(2)}/serving</div>
                      </div>
                    )}
                  </div>

                  {/* Nutrition Info */}
                  {selectedSearchRecipe.nutrition && (
                    <div className={`${theme.colors.bgSecondary} p-4 md:p-6 rounded-2xl mb-4 md:mb-6`}>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <h3 className={`text-lg md:text-xl font-bold flex items-center gap-2 ${theme.colors.text}`}>
                          <span>📊</span> Nutrition Facts
                          {usdaNutrition && (
                            <span className="text-sm font-normal text-green-600">
                              ({nutritionSource === 'usda' ? 'USDA Enhanced' : 'Spoonacular'})
                            </span>
                          )}
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-2">
                            Per serving
                          </span>
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
                                  : `${theme.colors.bgCard} ${theme.colors.text} hover:opacity-80`
                              }`}
                            >
                              Spoonacular
                            </button>
                            <button
                              onClick={() => setNutritionSource('usda')}
                              className={`px-3 py-1 rounded-lg font-bold text-sm transition-all ${
                                nutritionSource === 'usda'
                                  ? 'bg-green-500 text-white'
                                  : `${theme.colors.bgCard} ${theme.colors.text} hover:opacity-80`
                              }`}
                            >
                              USDA
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Enrichment Progress */}
                      {isEnriching && enrichmentProgress && (
                        <div className={`mb-4 p-4 ${theme.colors.bgCard} rounded-xl border ${theme.colors.border}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-bold ${theme.colors.text}`}>
                              Looking up ingredients in USDA database...
                            </span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {enrichmentProgress.current} / {enrichmentProgress.total}
                            </span>
                          </div>
                          <div className={`w-full ${theme.colors.bgSecondary} rounded-full h-2 mb-2`}>
                            <div
                              className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
                            ></div>
                          </div>
                          <p className={`text-xs ${theme.colors.textMuted}`}>
                            Current: {enrichmentProgress.ingredient}
                          </p>
                        </div>
                      )}

                      {/* Display nutrition data */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        {displayNutrients?.slice(0, 12).map((nutrient, i) => (
                          <div key={i} className={`${theme.colors.bgCard} border ${theme.colors.border} p-2 md:p-3 rounded-xl`}>
                            <div className={`text-xs ${theme.colors.textMuted} mb-1 line-clamp-2`}>
                              {nutritionSource === 'usda' ? formatNutrientName(nutrient.name) : nutrient.name}
                            </div>
                            <div className={`text-base md:text-lg font-bold ${theme.colors.text}`}>
                              {(nutrient.amount ? nutrient.amount.toFixed(1) : 'N/A')}{nutrient.unit}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* USDA whole recipe totals for context */}
                      {nutritionSource === 'usda' && displayTotals.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">
                            Whole recipe totals (USDA)
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {displayTotals.slice(0, 6).map((nutrient, i) => (
                              <div
                                key={i}
                                className={`${theme.colors.bgCard} border ${theme.colors.border} px-2 py-1 rounded-lg text-xs md:text-sm`}
                              >
                                <span className={`${theme.colors.text} font-semibold`}>
                                  {formatNutrientName(nutrient.name)}
                                </span>{' '}
                                <span className={theme.colors.textMuted}>
                                  {(nutrient.amount ? nutrient.amount.toFixed(1) : 'N/A')}{nutrient.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* USDA Coverage Info */}
                      {usdaNutrition && nutritionSource === 'usda' && (
                        <div className="mt-4 p-3 bg-green-100 rounded-xl">
                          <p className="text-sm text-green-800">
                            <strong>✅ {Math.round(usdaNutrition.coverage)}% ingredient coverage</strong>
                            {usdaNutrition.failedIngredients.length > 0 && (
                              <span className="block mt-1 text-xs">
                                Couldn&apos;t match: {usdaNutrition.failedIngredients.join(', ')}
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
                          <div key={i} className={`flex items-center gap-3 p-3 ${theme.colors.bgSecondary} rounded-xl`}>
                            <span className={theme.colors.text}>{ing.original}</span>
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
                          <div key={i} className={`flex gap-4 p-4 ${theme.colors.bgSecondary} rounded-xl`}>
                            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 dark:bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                              {step.number}
                            </div>
                            <p className={`${theme.colors.text} flex-1`}>{step.step}</p>
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











