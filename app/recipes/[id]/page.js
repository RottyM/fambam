"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Check path
import { usePantryCheck } from "@/hooks/usePantryCheck"; // The hook we made
import AddToGroceryButton from "@/components/AddToGroceryButton"; // The button we made

export default function RecipePage({ params }) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch the specific recipe based on the ID in the URL
  useEffect(() => {
    const fetchRecipe = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, "recipes", params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setRecipe({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("No such recipe!");
        }
      } catch (error) {
        console.error("Error fetching recipe:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [params.id]);

  // 2. Run the Pantry Check (Only if recipe exists)
  // We pass an empty array [] if recipe is null to prevent errors
  const { matches, loading: checkingPantry } = usePantryCheck(recipe ? recipe.ingredients : []);

  if (loading) return <div className="p-8 text-center">Loading recipe... 🍳</div>;
  if (!recipe) return <div className="p-8 text-center">Recipe not found 😔</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{recipe.name}</h1>
      
      {/* Recipe Image (Optional) */}
      {recipe.image && (
        <img src={recipe.image} alt={recipe.name} className="w-full h-64 object-cover rounded-2xl shadow-md" />
      )}

      {/* INGREDIENTS LIST */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Ingredients</h3>
        
        <ul className="space-y-3 mb-6">
          {recipe.ingredients && recipe.ingredients.map(ing => (
            <li key={ing} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {/* Status Icon */}
                {checkingPantry ? (
                  <span className="text-sm">⏳</span>
                ) : matches[ing] ? (
                  <span>✅</span>
                ) : (
                  <span>🛒</span>
                )}
                
                {/* Text style changes if we have it */}
                <span className={matches[ing] ? "text-gray-400 line-through" : "text-gray-800 dark:text-white font-medium"}>
                  {ing}
                </span>
              </span>
              
              {/* Optional: Label saying 'In Pantry' */}
              {matches[ing] && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                  In Pantry
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* THE MAGIC BUTTON */}
        {!checkingPantry && recipe.ingredients && (
          <AddToGroceryButton 
            ingredients={recipe.ingredients} 
            matches={matches}
            // If your groceries are stored under a family ID, pass it here. 
            // If they are global, you can remove this prop.
            // familyId={recipe.familyId} 
          />
        )}
      </div>
      
      {/* Instructions Section (Optional) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Instructions</h3>
        <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300">
            {recipe.instructions || "No instructions provided."}
        </p>
      </div>
    </div>
  );
}