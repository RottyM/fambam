"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaTrash, FaCamera, FaBoxOpen, FaCheck } from "react-icons/fa";

const EMPTY_STATE_EMOJI = "🥫";

function PantryContent() {
  const { theme, currentTheme } = useTheme();
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    brand: "",
    quantity: 1,
    image: "",
    barcode: "",
  });

  const pantryCollection = useMemo(() => {
    if (!userData?.familyId) return null;
    return collection(db, "families", userData.familyId, "pantry");
  }, [userData?.familyId]);

  useEffect(() => {
    if (!pantryCollection) {
      setLoading(false);
      return;
    }

    const q = query(pantryCollection, orderBy("addedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pantryList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setItems(pantryList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pantryCollection]);

  const resetDraft = () => {
    setDraft({ name: "", brand: "", quantity: 1, image: "", barcode: "" });
  };

  const openManualModal = () => {
    resetDraft();
    setShowModal(true);
  };

  const handleScan = async (barcode) => {
    setShowScanner(false);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await res.json();

      if (data.status === 1) {
        setDraft({
          name: data.product.product_name || "",
          brand: data.product.brands || "",
          image: data.product.image_front_small_url || "",
          quantity: 1,
          barcode,
        });
      } else {
        setDraft({ name: "", brand: "", image: "", quantity: 1, barcode });
      }
      setShowModal(true);
    } catch (error) {
      console.error("Scan lookup failed:", error);
      setDraft({ name: "", brand: "", image: "", quantity: 1, barcode });
      setShowModal(true);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!pantryCollection || !draft.name) return;
    setSaving(true);
    try {
      await addDoc(pantryCollection, {
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        image: draft.image || "",
        barcode: draft.barcode || "MANUAL",
        quantity: Number(draft.quantity) || 1,
        addedAt: serverTimestamp(),
      });
      setShowModal(false);
      resetDraft();
    } catch (error) {
      console.error("Error saving pantry item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!pantryCollection) return;
    const confirmed = window.confirm("Remove this item from your pantry?");
    if (!confirmed) return;
    await deleteDoc(doc(pantryCollection, itemId));
  };

  const headerTitle =
    currentTheme === "dark" ? "Pantry Vault" : "Pantry Shelves";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold">
            <span className={currentTheme === "dark" ? "text-purple-300" : "gradient-text"}>
              {headerTitle}
            </span>
          </h1>
          <p className={`text-sm sm:text-base font-semibold ${theme.colors.textMuted}`}>
            {loading ? "Loading..." : `${items.length} items stocked`}
          </p>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openManualModal}
            className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-4 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <FaPlus size={14} /> Add Item
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowScanner(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <FaCamera size={14} /> Scan
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div
          className={`flex items-center justify-center h-48 rounded-3xl border-2 border-dashed ${
            currentTheme === "dark" ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="text-center">
            <div className="text-4xl mb-2 animate-pulse">{EMPTY_STATE_EMOJI}</div>
            <p className={`font-semibold ${theme.colors.textMuted}`}>Loading pantry...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div
          className={`flex items-center justify-center h-52 rounded-3xl border-2 border-dashed ${
            currentTheme === "dark" ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="text-center">
            <div className="text-5xl mb-3">{EMPTY_STATE_EMOJI}</div>
            <p className={`text-xl font-bold ${theme.colors.text}`}>Your pantry is empty</p>
            <p className={`${theme.colors.textMuted} font-semibold`}>Scan a barcode or add an item manually.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              whileHover={{ y: -4 }}
              className={`${theme.colors.bgCard} rounded-2xl p-4 shadow-lg border ${theme.colors.border} flex gap-4`}
            >
              <div className="h-16 w-16 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center bg-white dark:bg-gray-900">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">{EMPTY_STATE_EMOJI}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-bold text-lg truncate ${theme.colors.text}`}>
                    {item.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded-lg">
                    <FaCheck size={10} /> x{item.quantity || 1}
                  </span>
                </div>
                {item.brand && (
                  <p className={`text-sm truncate ${theme.colors.textMuted}`}>{item.brand}</p>
                )}
                {item.barcode && (
                  <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">
                    {item.barcode}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="self-start p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                aria-label={`Delete ${item.name}`}
              >
                <FaTrash />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showScanner && (
          <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !saving && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 w-full max-w-md shadow-2xl border ${theme.colors.border}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md">
                  <FaBoxOpen />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${theme.colors.textMuted}`}>
                    Add pantry item
                  </p>
                  <h2 className={`text-xl font-bold ${theme.colors.text}`}>
                    {draft.barcode ? `Barcode ${draft.barcode}` : "Manual entry"}
                  </h2>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSave}>
                <div>
                  <label className={`block text-sm font-bold mb-1 ${theme.colors.textMuted}`}>
                    Item name *
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    required
                    className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500 font-semibold`}
                    placeholder="e.g., Peanut Butter"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-1 ${theme.colors.textMuted}`}>
                    Brand (optional)
                  </label>
                  <input
                    type="text"
                    value={draft.brand}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500 font-semibold`}
                    placeholder="Brand"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-bold mb-1 ${theme.colors.textMuted}`}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={draft.quantity}
                      onChange={(e) =>
                        setDraft({ ...draft, quantity: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500 font-semibold`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-1 ${theme.colors.textMuted}`}>
                      Image URL (optional)
                    </label>
                    <input
                      type="url"
                      value={draft.image}
                      onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                      className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500 font-semibold`}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className={`flex-1 ${theme.colors.bgSecondary} ${theme.colors.text} py-3 rounded-2xl font-bold hover:opacity-80 transition-all border ${theme.colors.border}`}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !draft.name}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Item"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PantryPage() {
  return (
    <DashboardLayout>
      <PantryContent />
    </DashboardLayout>
  );
}
