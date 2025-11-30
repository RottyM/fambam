"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// 1. EXPANDED STOP WORDS
const STOP_WORDS = [
  "cup", "cups", "tbsp", "tsp", "tablespoon", "teaspoon", 
  "oz", "ounce", "lb", "pound", "g", "gram", "kg", "ml", "l", 
  "pinch", "dash", "can", "cans", "jar", "container", "box", "bag",
  "of", "and", "&", "or", "large", "medium", "small", "clove", "cloves",
  "bunch", "head", "stick", "sticks", "bottle", "package", "pkt",
  "style", "mix", "blend", "seasoning", "extract", "flavor"
];

const normalize = (value = "") => {
  if (!value) return [];
  let cleaned = value.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") 
    .trim();
  const words = cleaned.split(/\s+/);
  return words.filter(w => {
    const isNumber = !isNaN(w); 
    const isUnit = STOP_WORDS.includes(w); 
    const isTooShort = w.length < 2; 
    return !isNumber && !isUnit && !isTooShort;
  });
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
      (error) => { console.error(error); setPantryItems([]); setLoading(false); }
    );
    return () => unsubscribe();
  }, [userData?.familyId]);

  // 2. SCORING ALGORITHM
  useEffect(() => {
    if (loading || !ingredients.length) return;

    const newMatches = {};
    const newDetails = {};

    const analyzedPantry = pantryItems.map((item) => ({
      original: item,
      keywords: normalize(item.name || "")
    }));

    ingredients.forEach((ingredient) => {
      const ingObj = typeof ingredient === "string" ? { name: ingredient } : ingredient || {};
      const rawName = ingObj.name || "";
      const ingKeywords = normalize(rawName);

      if (ingKeywords.length === 0) {
        newMatches[rawName] = false;
        return;
      }

      let bestMatch = null;
      let highestScore = 0;

      analyzedPantry.forEach((p) => {
        let score = 0;

        // 1. Exact Match (100 pts)
        if (ingKeywords.join(" ") === p.keywords.join(" ")) {
          score = 100;
        } 
        
        // 2. "The Noun Rule" (Last Word Bonus) - NEW!
        // If we are looking for "Pepper", and the pantry item ENDS in "Pepper",
        // it's almost certainly a match, even if the start is different.
        // "Restaurant Black [Pepper]" ends in "Pepper" -> MATCH
        // "Lemon Garlic [Butter]" ends in "Butter" -> "Garlic" NO MATCH
        else if (ingKeywords.length === 1 && p.keywords.length > 0) {
            const lastPantryWord = p.keywords[p.keywords.length - 1];
            if (ingKeywords[0] === lastPantryWord) {
                score = 90; // High confidence match
            }
        }

        // 3. Strict Phrase Containment (80 pts)
        // Applies if we searched for a phrase (e.g., "Olive Oil" in "Virgin Olive Oil")
        if (score === 0 && ingKeywords.length > 1) {
          const pString = p.keywords.join(" ");
          const iString = ingKeywords.join(" ");
          if (pString.includes(iString)) score = 80;
        }
        
        // 4. Ratio Calculation (Tie Breaker)
        if (score === 0) {
          const intersection = ingKeywords.filter(k => p.keywords.includes(k));
          if (intersection.length > 0) {
            const matchRatio = intersection.length / p.keywords.length;
            score = Math.floor(matchRatio * 100); 
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = p;
        }
      });

      // Threshold: 50% match required
      if (bestMatch && highestScore >= 50) {
        newMatches[rawName] = true;
        newMatches[rawName.toLowerCase().trim()] = true;
        newDetails[rawName] = {
          name: bestMatch.original.name,
          category: bestMatch.original.category,
        };
      } else {
        newMatches[rawName] = false;
      }
    });

    setMatches(newMatches);
    setMatchedDetails(newDetails);

  }, [pantryItems, JSON.stringify(ingredients), loading]);

  const summary = useMemo(() => {
    const total = ingredients.length;
    const have = Object.values(matches).filter(Boolean).length;
    const need = Math.max(0, total - have);
    return { total, have, need };
  }, [ingredients.length, matches]);

  return { matches, loading, summary, matchedDetails };
}