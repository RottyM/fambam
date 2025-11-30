"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const normalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const maybeCategory = (value = "") => value.toLowerCase().trim();

export function usePantryCheck(ingredients = []) {
  const { userData } = useAuth();
  const [pantryItems, setPantryItems] = useState([]);
  const [matches, setMatches] = useState({}); // Stores which ingredients we found
  const [matchedDetails, setMatchedDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. Fetch Pantry (family scoped when available, otherwise fallback)
  useEffect(() => {
    if (!userData?.familyId) {
      setPantryItems([]);
      setLoading(false);
      return;
    }

    const colRef = collection(db, "families", userData.familyId, "pantry");

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
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

// 2. Compare Ingredients to Pantry (using name + category when present)
  useEffect(() => {
    if (loading || !ingredients.length) return;

    const newMatches = {};
    const newDetails = {};
    const normalizedPantry = pantryItems.map((item) => ({
      name: normalize(item.name || ""),
      category: maybeCategory(item.category || ""),
      brand: normalize(item.brand || ""),
      rawName: item.name || "",
      rawCategory: item.category || "",
    }));

    ingredients.forEach((ingredient) => {
      const ingObj =
        typeof ingredient === "string"
          ? { name: ingredient, category: "" }
          : ingredient || {};
      const nameRaw = ingObj.name || "";
      const ingName = normalize(nameRaw);
      const ingCategory = maybeCategory(ingObj.category || "");

      if (!ingName) {
        newMatches[nameRaw] = false;
        return;
      }

      const found = normalizedPantry.find((p) => {
        const nameMatch =
          p.name === ingName ||
          p.name.includes(ingName) ||
          ingName.includes(p.name);
        const categoryMatch =
          !ingCategory || !p.category || ingCategory === p.category;
        return nameMatch && categoryMatch;
      });

      const markMatch = (key) => {
        if (!key) return;
        newMatches[key] = true;
        newDetails[key] = {
          name: found.rawName,
          category: found.rawCategory,
        };
      };

      if (found) {
        markMatch(nameRaw);
        markMatch(ingName);
      } else {
        newMatches[nameRaw] = false;
        newMatches[ingName] = false;
      }
    });

    setMatches(newMatches);
    setMatchedDetails(newDetails);

  // -----------------------------------------------------------------------
  // CRITICAL FIX: We add JSON.stringify(ingredients) here.
  // This ensures the loop breaks unless the ACTUAL DATA changes.
  // -----------------------------------------------------------------------
  }, [pantryItems, JSON.stringify(ingredients), loading]);

  
  const summary = useMemo(() => {
    const total = ingredients.length;
    const have = Object.values(matches).filter(Boolean).length;
    const need = Math.max(0, total - have);
    return { total, have, need };
  }, [ingredients.length, matches]);

  return { matches, loading, summary, matchedDetails };
}
