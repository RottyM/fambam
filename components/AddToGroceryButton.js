"use client";

import { useState } from "react";
import { writeBatch, collection, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AddToGroceryButton({ ingredients, matches, familyId = null }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  // 1. Calculate what is actually missing
  const missingItems = ingredients.filter(ing => !matches[ing]);

  const handleAddMissing = async () => {
    if (missingItems.length === 0) return;
    setLoading(true);

    try {
      const batch = writeBatch(db);
      
      // DETERMINE COLLECTION PATH
      // If your groceries are inside a family: `families/${familyId}/groceries`
      // If your groceries are at the root: `groceries`
      // Based on your rules, it looks like they might be nested. 
      // UPDATE THIS STRING if needed:
      const collectionPath = familyId ? `families/${familyId}/groceries` : "groceries";

      missingItems.forEach((item) => {
        // Create a new reference for each missing item
        const newDocRef = doc(collection(db, collectionPath));
        batch.set(newDocRef, {
          text: item, // Matches your Todo/Grocery naming convention
          completed: false,
          addedAt: serverTimestamp(),
          category: "Auto-Import", // Optional: helps you know this came from a recipe
        });
      });

      await batch.commit(); // Sends all data in one shot
      setAdded(true);
      
      // Reset "Added" message after 3 seconds
      setTimeout(() => setAdded(false), 3000);

    } catch (error) {
      console.error("Error batch adding groceries:", error);
      alert("Failed to add items to list.");
    } finally {
      setLoading(false);
    }
  };

  if (missingItems.length === 0) {
    return (
      <div className="p-3 bg-green-100 text-green-700 rounded-xl text-center text-sm font-semibold">
        ✨ You have all ingredients!
      </div>
    );
  }

  return (
    <button
      onClick={handleAddMissing}
      disabled={loading || added}
      className={`w-full py-3 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2
        ${added 
          ? "bg-green-500 text-white" 
          : "bg-orange-100 text-orange-600 hover:bg-orange-200"
        }
      `}
    >
      {loading ? (
        <span>Adding...</span>
      ) : added ? (
        <span>✅ Added to List!</span>
      ) : (
        <>
          <span>🛒</span>
          <span>Add {missingItems.length} Missing Items</span>
        </>
      )}
    </button>
  );
}