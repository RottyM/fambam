"use client";

import React, { useState, useEffect } from "react";
import BarcodeScanner from "../../components/BarcodeScanner"; // Ensure this matches where you saved the scanner
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc 
} from "firebase/firestore";
// Adjust this import to match your actual firebase export. 
// Based on your file tree, it's likely one of these:
import { db } from "../../lib/firebase"; 

export default function PantryPage() {
  const [items, setItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // State for the "Confirm Item" Modal
  const [scannedProduct, setScannedProduct] = useState(null); // Stores data from API
  const [newItemQty, setNewItemQty] = useState(1);

  // 1. Listen to Pantry Data (Real-time)
  useEffect(() => {
    const q = query(collection(db, "pantry"), orderBy("addedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pantryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(pantryList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Handle Scan Logic
  const handleScan = async (barcode) => {
    setShowScanner(false); // Close camera
    
    // Show a temporary loading state or toast could go here
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();

      if (data.status === 1) {
        // Product found! Open confirmation modal
        setScannedProduct({
          name: data.product.product_name || "Unknown Item",
          image: data.product.image_front_small_url || null,
          barcode: barcode,
          brand: data.product.brands || "",
        });
        setNewItemQty(1);
      } else {
        alert("Item not found in database. You can add it manually (Manual entry not built yet).");
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Could not fetch product details.");
    }
  };

  // 3. Add to Firebase
  const confirmAddItem = async () => {
    if (!scannedProduct) return;

    try {
      await addDoc(collection(db, "pantry"), {
        name: scannedProduct.name,
        barcode: scannedProduct.barcode,
        image: scannedProduct.image,
        brand: scannedProduct.brand,
        quantity: parseInt(newItemQty),
        addedAt: serverTimestamp(),
      });
      
      // Reset state
      setScannedProduct(null);
    } catch (error) {
      console.error("Error adding doc:", error);
      alert("Failed to save item.");
    }
  };

  // 4. Delete Item (Optional Helper)
  const handleDelete = async (id) => {
    if (confirm("Eat this item? (Remove from pantry)")) {
      await deleteDoc(doc(db, "pantry", id));
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            My Pantry 🍎
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {items.length} items in stock
          </p>
        </div>
        
        {/* FAB (Floating Action Button) for Mobile or Desktop */}
        <button
          onClick={() => setShowScanner(true)}
          className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg transition-all transform hover:scale-105"
          // Note: If you have a custom 'primary' color in tailwind config, use that class. 
          // Otherwise, replace 'bg-primary' with 'bg-blue-500'
        >
          <span className="text-xl">📷</span>
          <span className="font-bold">Scan</span>
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-gray-400 animate-pulse">Loading pantry...</p>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-400">
            <p className="text-4xl mb-2">🧺</p>
            <p>Your pantry is empty!</p>
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors"
            >
              {/* Product Image */}
              <div className="h-16 w-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 dark:text-white truncate">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {item.brand}
                </p>
                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  x{item.quantity}
                </div>
              </div>

              {/* Delete Button */}
              <button 
                onClick={() => handleDelete(item.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* --- SCANNERS & MODALS --- */}

      {/* 1. Barcode Scanner Overlay */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* 2. Confirm Item Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="text-center">
              {scannedProduct.image && (
                <img 
                  src={scannedProduct.image} 
                  alt="Scanned" 
                  className="mx-auto h-32 object-contain mb-4 rounded-lg"
                />
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {scannedProduct.name}
              </h2>
              <p className="text-sm text-gray-500 mb-6">{scannedProduct.brand}</p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button 
                onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300"
              >
                -
              </button>
              <span className="text-2xl font-bold text-gray-800 dark:text-white w-8 text-center">
                {newItemQty}
              </span>
              <button 
                onClick={() => setNewItemQty(newItemQty + 1)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300"
              >
                +
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScannedProduct(null)}
                className="py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddItem}
                className="py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
              >
                Add to Pantry
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}