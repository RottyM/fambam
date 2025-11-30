"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Check your import path

export function usePantryCheck(ingredients = []) {
  const [pantryItems, setPantryItems] = useState([]);
  const [matches, setMatches] = useState({}); // Stores which ingredients we found
  const [loading, setLoading] = useState(true);

  // 1. Fetch Pantry
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "pantry"), (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data());
      setPantryItems(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Compare Ingredients to Pantry
  useEffect(() => {
    if (loading || !ingredients.length) return;

    const newMatches = {};

    ingredients.forEach(ingredient => {
      // Normalize to lowercase for better matching
      const cleanIng = ingredient.toLowerCase().trim();

      // Check if ANY pantry item contains this word (or vice versa)
      const isFound = pantryItems.some(pantryItem => {
        const cleanPantry = pantryItem.name.toLowerCase();
        // Match: "Tomato" matches "Tomato Sauce" OR "Tomato Sauce" matches "Tomato"
        return cleanPantry.includes(cleanIng) || cleanIng.includes(cleanPantry);
      });

      newMatches[ingredient] = isFound;
    });

    setMatches(newMatches);
  }, [pantryItems, ingredients, loading]);

  return { matches, loading };
}