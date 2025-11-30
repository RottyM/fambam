"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// 1. LIST OF JUNK WORDS TO IGNORE
const STOP_WORDS = [
  "cup", "cups", "tbsp", "tsp", "tablespoon", "teaspoon", 
  "oz", "ounce", "lb", "pound", "g", "gram", "kg", "ml", "l", 
  "pinch", "dash", "can", "cans", "jar", "container", "box", "bag",
  "of", "and", "&", "or", "large", "medium", "small", "clove", "cloves",
  "bunch", "head", "stick", "sticks", "bottle", "package", "pkt"
];

// 2. CLEANER FUNCTION
const normalize = (value = "") => {
  if (!value) return [];
  
  // Lowercase and remove special characters (keep letters/numbers/spaces)
  let cleaned = value.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") 
    .trim();

  // Split into words
  const words = cleaned.split(/\s+/);

  // Filter out numbers and stop words
  const significantWords = words.filter(w => {
    const isNumber = !isNaN(w); // Remove "1", "100"
    const isUnit = STOP_WORDS.includes(w); // Remove "cup", "oz"
    const isTooShort = w.length < 2; // Remove "a", "x"
    return !isNumber && !isUnit && !isTooShort;
  });

  return significantWords; // Returns array: ["olive", "oil"]
};

export function usePantryCheck(ingredients = []) {
  const { userData } = useAuth();
  const [pantryItems, setPantryItems] = useState([]);
  const [matches, setMatches] = useState({}); 
  const [matchedDetails, setMatchedDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Fetch Pantry
  useEffect(() => {
    if (!userData?.familyId) {
      setPantryItems([]);
      setLoading(false);
      return;
    }

    const colRef = collection(db, "families", userData.familyId, "pantry");
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setPantryItems(items);
        setLoading(false);
      },
      (error) => {
        console.error("Pantry listener error:", error);
        setPantryItems([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userData?.familyId]);

  // 2. The Smart Matching Logic
  useEffect(() => {
    if (loading || !ingredients.length) return;

    const newMatches = {};
    const newDetails = {};

    // A. Pre-process pantry items into word arrays
    const analyzedPantry = pantryItems.map((item) => ({
      original: item,
      keywords: normalize(item.name || "")
    }));

    // B. Check each ingredient against the analyzed pantry
    ingredients.forEach((ingredient) => {
      // Handle both string "Milk" and object {name: "Milk"}
      const ingObj = typeof ingredient === "string" 
        ? { name: ingredient } 
        : ingredient || {};
      
      const rawName = ingObj.name || "";
      const ingKeywords = normalize(rawName); // e.g. ["salt", "pepper"]

      if (ingKeywords.length === 0) {
        newMatches[rawName] = false;
        return;
      }

      // FIND A MATCH
      const found = analyzedPantry.find((p) => {
        // Strategy A: Exact Keyword Match
        const exactMatch = ingKeywords.join(" ") === p.keywords.join(" ");
        if (exactMatch) return true;

        // Strategy B: Containment (How 'Pepper' matched)
        const pString = p.keywords.join(" ");
        const iString = ingKeywords.join(" ");
        if (pString.includes(iString) || iString.includes(pString)) return true;

        // Strategy C: Word Overlap (How 'Salt & Pepper' matches 'Salt')
        const intersection = ingKeywords.filter(k => p.keywords.includes(k));
        
        // Match if share meaningful words (no category check here!)
        return intersection.length > 0;
      });

      if (found) {
        newMatches[rawName] = true;
        // Also map the normalized version just in case
        newMatches[rawName.toLowerCase().trim()] = true;
        
        newDetails[rawName] = {
          name: found.original.name,
          category: found.original.category,
        };
      } else {
        newMatches[rawName] = false;
      }
    });

    setMatches(newMatches);
    setMatchedDetails(newDetails);

  // Keep JSON.stringify to prevent infinite loops
  }, [pantryItems, JSON.stringify(ingredients), loading]);

  const summary = useMemo(() => {
    const total = ingredients.length;
    const have = Object.values(matches).filter(Boolean).length;
    const need = Math.max(0, total - have);
    return { total, have, need };
  }, [ingredients.length, matches]);

  return { matches, loading, summary, matchedDetails };
}