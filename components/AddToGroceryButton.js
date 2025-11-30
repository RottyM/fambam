"use client";

import { useState } from "react";
import { writeBatch, collection, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AddToGroceryButton({ ingredients, matches, familyId = null }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  // --- SMART FILTER: Handles Strings (Old) OR Objects (AI) ---
  const missingItems = ingredients.filter((ing) => {
    // Extract name safely regardless of format
    const nameToCheck = typeof ing === 'object' && ing !== null ? ing.name : ing;
    
    // Check if we already have it (matches uses keys)
    return !matches[nameToCheck];
  });

  const handleAddMissing = async () => {
    if (missingItems.length === 0) return;

    // Safety Check: Prevent "Root" writes
    if (!familyId) {
      alert("Please wait for your profile to load.");
      return;
    }

    setLoading(true);

    try {
      const batch = writeBatch(db);
      const collectionPath = `families/${familyId}/groceries`;

      missingItems.forEach((item) => {
        const newDocRef = doc(collection(db, collectionPath));

        // 1. Detect if 'item' is a String or an Object
        const isObject = typeof item === 'object' && item !== null;
        
        // 2. Extract data safely
        const itemName = isObject ? item.name : item;
        const itemCategory = (isObject && item.category) ? item.category : "Auto-Import";
        // AI might return quantity, otherwise default to empty
        const itemQuantity = (isObject && item.quantity) ? item.quantity : "";

        batch.set(newDocRef, {
          name: itemName,         // Correct field name for your Page
          checked: false,         // Correct status field
          addedAt: serverTimestamp(),
          category: itemCategory, // Preserves AI category
          quantity: itemQuantity, // Preserves AI quantity
        });
      });

      await batch.commit();
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