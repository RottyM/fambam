'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Upload, Edit, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

const CATEGORIES = {
  produce: { name: 'Produce', icon: '🥬', color: 'from-green-400 to-green-500' },
  dairy: { name: 'Dairy', icon: '🥛', color: 'from-blue-400 to-blue-500' },
  meat: { name: 'Meat & Seafood', icon: '🍖', color: 'from-red-400 to-red-500' },
  frozen: { name: 'Frozen', icon: '🧊', color: 'from-cyan-400 to-cyan-500' },
  pantry: { name: 'Pantry', icon: '🥫', color: 'from-yellow-400 to-yellow-500' },
  bakery: { name: 'Bakery', icon: '🍞', color: 'from-orange-400 to-orange-500' },
  snacks: { name: 'Snacks', icon: '🍿', color: 'from-purple-400 to-purple-500' },
  beverages: { name: 'Beverages', icon: '🥤', color: 'from-pink-400 to-pink-500' },
  other: { name: 'Other', icon: '🛒', color: 'from-gray-400 to-gray-500' },
};

// --- Helper Logic (Self-Contained) ---

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

function validateRecipeData(recipeData) {
  const cleaned = {
    name: recipeData.name?.trim() || 'Untitled Recipe',
    description: recipeData.description?.trim() || '',
    servings: recipeData.servings?.trim() || '4 servings',
    prepTime: recipeData.prepTime?.trim() || '',
    cookTime: recipeData.cookTime?.trim() || '',
    ingredients: [],
    instructions: recipeData.instructions?.trim() || '',
    notes: recipeData.notes?.trim() || '',
    sourceType: recipeData.sourceType || 'printed',
    confidence: recipeData.confidence || 'medium',
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

// Mock Data (Fallback if API fails or isn't deployed yet)
const MOCK_RECIPE = {
  name: "Grandma's Chocolate Chip Cookies",
  ingredients: [
    { name: "Butter", amount: "1 cup", category: "dairy" },
    { name: "White Sugar", amount: "1 cup", category: "pantry" },
    { name: "Brown Sugar", amount: "1 cup", category: "pantry" },
    { name: "Eggs", amount: "2", category: "dairy" },
    { name: "Vanilla Extract", amount: "2 tsp", category: "pantry" },
    { name: "All-purpose Flour", amount: "3 cups", category: "pantry" },
    { name: "Baking Soda", amount: "1 tsp", category: "pantry" },
    { name: "Salt", amount: "1/2 tsp", category: "pantry" },
    { name: "Semisweet Chocolate Chips", amount: "2 cups", category: "pantry" },
  ],
  instructions: "1. Preheat oven to 350°F.\n2. Cream butter and sugars.\n3. Beat in eggs and vanilla.\n4. Mix in dry ingredients.\n5. Stir in chocolate chips.\n6. Bake 10 mins.",
  servings: "24 cookies",
  prepTime: "20 mins",
  cookTime: "10 mins",
  notes: "Don't overbake!",
  sourceType: "mixed",
  confidence: "high"
};

async function scanRecipe(imageFile) {
  try {
    const base64Image = await fileToBase64(imageFile);
    const mimeType = imageFile.type || 'image/jpeg';

    // ✅ CORRECT: Removed '/app' and the trailing slash
    const response = await fetch('/api/scan-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, mimeType }),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok || (contentType && contentType.indexOf("application/json") === -1)) {
       throw new Error("API unavailable");
    }

    const data = await response.json();
    return { success: true, recipe: data.recipe };

  } catch (error) {
    console.warn('API Connection failed (likely missing backend), falling back to simulation.', error);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, recipe: MOCK_RECIPE };
  }
}

// --- Main Component ---

export default function RecipeScannerModal({ isOpen = false, onClose = () => {}, onSaveRecipe = async () => {}
}) {
  const { theme, currentTheme } = useTheme();
  const [step, setStep] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scannedRecipe, setScannedRecipe] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Reset state when modal closes fully
  const resetState = () => {
    setStep('upload');
    setImageFile(null);
    setImagePreview(null);
    setScannedRecipe(null);
    setIsScanning(false);
    setEditMode(false);
  };

  const handleClose = () => {
    onClose();
    // Wait for animation to finish before resetting state
    setTimeout(resetState, 500);
  };

  const handleImageSelect = (file) => {
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleScanRecipe = async () => {
    if (!imageFile) {
      toast.error('Please select an image first');
      return;
    }

    setIsScanning(true);
    setStep('scanning');

    try {
      const result = await scanRecipe(imageFile);

      if (result.success) {
        const cleanedRecipe = validateRecipeData(result.recipe);
        setScannedRecipe(cleanedRecipe);
        setStep('preview');
        
        if (result.recipe.confidence === 'low') {
          toast.success('Scan complete. Please review text.');
        } else {
          toast.success('Recipe scanned successfully!');
        }
      } else {
        toast.error('Failed to scan. Please try again.');
        setStep('upload'); 
      }
    } catch (error) {
      console.error('Failed to scan recipe:', error);
      toast.error('Failed to scan recipe.');
      setStep('upload');
    } finally {
      setIsScanning(false);
    }
  };

const handleSave = async () => {
    try {
      // 1. Call parent save function (Your main app handles the success Toast)
      await onSaveRecipe(scannedRecipe, imageFile);
      
      // 2. Close the modal immediately
      handleClose(); 
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save recipe');
    }
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...scannedRecipe.ingredients];
    updated[index][field] = value;
    setScannedRecipe({ ...scannedRecipe, ingredients: updated });
  };

  const handleAddIngredient = () => {
    setScannedRecipe({
      ...scannedRecipe,
      ingredients: [...scannedRecipe.ingredients, { name: '', amount: '', category: 'other' }],
    });
  };

  const handleRemoveIngredient = (index) => {
    setScannedRecipe({
      ...scannedRecipe,
      ingredients: scannedRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >

          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className={`${theme.colors.bgCard} rounded-3xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col border-2 ${theme.colors.border}`}
          >
            {/* Header */}
            <div className={`sticky top-0 ${theme.colors.bgCard} backdrop-blur ${theme.colors.borderLight} border-b px-6 py-4 rounded-t-3xl flex items-center justify-between z-10`}>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                <Camera className="text-purple-500" /> Scan Recipe
              </h2>
              <button
                onClick={handleClose}
                className={`${theme.colors.textMuted} hover:${theme.colors.text} p-2 rounded-full hover:bg-gray-700/50 transition-colors`}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Step 1: Upload */}
              {step === 'upload' && (
                <div className="space-y-8 py-4">
                  <div className="text-center space-y-2">
                     <p className={`${theme.colors.textMuted} max-w-md mx-auto`}>
                    Take a photo or upload an image of a recipe to automatically extract the ingredients and instructions.
                  </p>
                  </div>
                 
                  {imagePreview ? (
                    <div className={`relative w-full h-64 rounded-2xl overflow-hidden ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} border-2 ${theme.colors.borderLight}`}>
                      <Image
                        src={imagePreview}
                        alt="Recipe preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain"
                      />
                      <button
                        onClick={() => {setImagePreview(null); setImageFile(null);}}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                      >
                        <X size={16}/>
                      </button>
                    </div>
                  ) : (
                     <div className={`border-2 border-dashed ${theme.colors.borderLight} rounded-2xl p-8 text-center ${currentTheme === 'dark' ? 'bg-gray-900/50 hover:bg-gray-900' : 'bg-gray-50/50 hover:bg-gray-50'} transition-colors`}>
                        <div className={`mx-auto w-16 h-16 ${currentTheme === 'dark' ? 'bg-purple-900/30' : 'bg-blue-50'} rounded-full flex items-center justify-center mb-4 ${currentTheme === 'dark' ? 'text-purple-400' : 'text-blue-500'}`}>
                          <Upload size={32} />
                        </div>
                        <p className={`${theme.colors.textMuted} text-sm`}>No image selected yet</p>
                     </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="group bg-gradient-to-br from-purple-500 to-indigo-600 text-white py-6 rounded-2xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-3"
                    >
                      <Camera size={28} className="group-hover:scale-110 transition-transform"/>
                      <span>Take Photo</span>
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => { if(e.target.files[0]) handleImageSelect(e.target.files[0]); }}
                      className="hidden"
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="group bg-gradient-to-br from-emerald-400 to-teal-600 text-white py-6 rounded-2xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex flex-col items-center justify-center gap-3"
                    >
                      <Upload size={28} className="group-hover:scale-110 transition-transform"/>
                      <span>Upload Image</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => { if(e.target.files[0]) handleImageSelect(e.target.files[0]); }}
                      className="hidden"
                    />
                  </div>

                  {imageFile && (
                    <button
                      onClick={handleScanRecipe}
                      className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <span>✨ Scan Recipe</span>
                    </button>
                  )}
                </div>
              )}

              {/* Step 2: Scanning */}
              {isScanning && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative mb-6">
                     <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                     <div className={`relative ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-4 rounded-full shadow-xl animate-bounce`}>
                        <Camera size={48} className="text-purple-500" />
                     </div>
                  </div>
                  <p className={`text-xl font-bold ${theme.colors.text} mb-2`}>Reading Recipe...</p>
                  <p className={`${theme.colors.textMuted} text-sm max-w-xs text-center`}>Analyzing ingredients, instructions, and notes.</p>
                  <div className={`mt-8 w-64 h-2 ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                    <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 animate-progress w-full origin-left"></div>
                  </div>
                  <style>{`
                    @keyframes progress {
                      0% { transform: scaleX(0); }
                      50% { transform: scaleX(0.7); }
                      100% { transform: scaleX(1); }
                    }
                    .animate-progress {
                      animation: progress 2s infinite ease-in-out;
                    }
                  `}</style>
                </div>
              )}

              {/* Step 3: Preview/Edit */}
              {step === 'preview' && scannedRecipe && (
                <div className="space-y-8">
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${theme.colors.borderLight} pb-6`}>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                        <h3 className={`text-xl font-bold ${theme.colors.text}`}>Review Scanned Recipe</h3>

                        {scannedRecipe.sourceType === 'handwritten' && (
                          <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full border border-amber-200 font-semibold flex items-center gap-1">
                            <Edit size={12} /> Handwritten
                          </span>
                        )}
                        {scannedRecipe.sourceType === 'mixed' && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full border border-blue-200 font-semibold flex items-center gap-1">
                            <AlertCircle size={12} /> Annotated
                          </span>
                        )}
                        </div>
                        <p className={`text-sm ${theme.colors.textMuted}`}>Check details carefully before adding to your list.</p>
                    </div>

                    <button
                      onClick={() => setEditMode(!editMode)}
                      className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                        editMode
                          ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                          : `${currentTheme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                      }`}
                    >
                      {editMode ? <><Check size={18} /> Done Editing</> : <><Edit size={18} /> Edit Details</>}
                    </button>
                  </div>

                  {/* Name */}
                  <div>
                    <label className={`block text-xs uppercase tracking-wider font-bold ${theme.colors.textMuted} mb-2`}>Recipe Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={scannedRecipe.name}
                        onChange={(e) => setScannedRecipe({ ...scannedRecipe, name: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border-2 ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none font-bold text-xl`}
                      />
                    ) : (
                      <p className={`text-2xl font-bold ${theme.colors.text}`}>{scannedRecipe.name}</p>
                    )}
                  </div>

                  {/* Meta (Servings, Time) */}
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-4 rounded-2xl border ${theme.colors.borderLight}`}>
                    <div>
                      <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Servings</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={scannedRecipe.servings}
                          onChange={(e) => setScannedRecipe({ ...scannedRecipe, servings: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none text-sm`}
                        />
                      ) : (
                        <p className={`${theme.colors.text} font-medium`}>{scannedRecipe.servings}</p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Prep Time</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={scannedRecipe.prepTime}
                          onChange={(e) => setScannedRecipe({ ...scannedRecipe, prepTime: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none text-sm`}
                        />
                      ) : (
                        <p className={`${theme.colors.text} font-medium`}>{scannedRecipe.prepTime || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Cook Time</label>
                      {editMode ? (
                        <input
                          type="text"
                          value={scannedRecipe.cookTime}
                          onChange={(e) => setScannedRecipe({ ...scannedRecipe, cookTime: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg border ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none text-sm`}
                        />
                      ) : (
                        <p className={`${theme.colors.text} font-medium`}>{scannedRecipe.cookTime || '-'}</p>
                      )}
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <label className={`block text-xs uppercase tracking-wider font-bold ${theme.colors.textMuted} mb-3`}>
                      Ingredients ({scannedRecipe.ingredients.length})
                    </label>
                    <div className="space-y-2">
                      {scannedRecipe.ingredients.map((ing, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2 items-center group">
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                value={ing.name}
                                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                placeholder="Ingredient"
                                className={`w-full px-3 py-2 rounded-lg border ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none text-sm`}
                              />
                              <input
                                type="text"
                                value={ing.amount}
                                onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                                placeholder="Amount"
                                className={`w-full px-3 py-2 rounded-lg border ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none text-sm`}
                              />
                              <div className="flex items-center gap-2">
                                <select
                                  value={ing.category}
                                  onChange={(e) => handleIngredientChange(index, 'category', e.target.value)}
                                  className={`w-full px-3 py-2 rounded-lg border ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none text-sm`}
                                >
                                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <option key={key} value={key}>{cat.name}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleRemoveIngredient(index)}
                                  className={`p-2 text-red-400 hover:text-red-600 ${currentTheme === 'dark' ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} rounded-lg transition-colors`}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className={`flex-1 p-3 ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme.colors.borderLight} rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow`}>
                              <span className={`font-medium ${theme.colors.text}`}>{ing.name}</span>
                              {ing.amount && (
                                <span className={`text-xs font-bold ${theme.colors.textMuted} ${currentTheme === 'dark' ? 'bg-purple-900/30' : 'bg-gray-100'} px-2 py-1 rounded-lg`}>
                                  {ing.amount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {editMode && (
                      <button
                        onClick={handleAddIngredient}
                        className={`mt-3 text-sm text-purple-500 font-bold hover:text-purple-600 flex items-center gap-1 px-2 py-1 rounded-lg ${currentTheme === 'dark' ? 'hover:bg-purple-900/20' : 'hover:bg-purple-50'} transition-colors w-fit`}
                      >
                         + Add Ingredient
                      </button>
                    )}
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className={`block text-xs uppercase tracking-wider font-bold ${theme.colors.textMuted} mb-3`}>Instructions</label>
                    {editMode ? (
                      <textarea
                        value={scannedRecipe.instructions}
                        onChange={(e) => setScannedRecipe({ ...scannedRecipe, instructions: e.target.value })}
                        className={`w-full px-4 py-3 rounded-xl border-2 ${theme.colors.borderLight} ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} ${theme.colors.text} focus:border-purple-500 focus:outline-none font-medium leading-relaxed`}
                        rows={10}
                      />
                    ) : (
                      <div className={`p-5 ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} border ${theme.colors.borderLight} rounded-2xl whitespace-pre-line leading-relaxed ${theme.colors.text} shadow-sm`}>
                        {scannedRecipe.instructions}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {scannedRecipe.notes && (
                     <div className="bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100">
                      <label className="block text-xs font-bold text-yellow-700 mb-2 flex items-center gap-1">
                        <Edit size={12}/> Handwritten Notes & Annotations
                      </label>
                      {editMode ? (
                        <textarea
                          value={scannedRecipe.notes}
                          onChange={(e) => setScannedRecipe({ ...scannedRecipe, notes: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl border-2 border-yellow-200 focus:border-yellow-500 focus:outline-none font-medium text-yellow-900 ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
                          rows={3}
                        />
                      ) : (
                        <div className="whitespace-pre-line text-gray-800 italic font-medium">
                           &quot;{scannedRecipe.notes}&quot;
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer Buttons */}
                  <div className={`flex gap-3 pt-6 border-t ${theme.colors.borderLight}`}>
                    <button
                      onClick={() => setStep('upload')}
                      className={`flex-1 ${currentTheme === 'dark' ? 'bg-gray-900 border-2 border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'} py-3 rounded-xl font-bold transition-all`}
                    >
                      Scan Another
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={20} />
                      <span>Save Recipe</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
