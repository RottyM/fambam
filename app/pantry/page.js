import DashboardLayout from "@/components/DashboardLayout";
import React, { useState, useEffect } from "react";
import BarcodeScanner from "@/components/BarcodeScanner"; // Uses @ alias for safety
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
// Adjust this import if your firebase file is elsewhere
import { db } from "@/lib/firebase"; 

function PantryContent() {
  const [items, setItems] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // State for the "Confirm Item" Modal
  const [scannedProduct, setScannedProduct] = useState(null); // Stores data from API or Manual Entry
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

  // 2. Handle Barcode Scan
  const handleScan = async (barcode) => {
    setShowScanner(false); // Close camera
    
    try {
      // Fetch data from OpenFoodFacts
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();

      if (data.status === 1) {
        // Product found! Open confirmation modal with data pre-filled
        setScannedProduct({
          name: data.product.product_name || "Unknown Item",
          image: data.product.image_front_small_url || null,
          barcode: barcode,
          brand: data.product.brands || "",
        });
        setNewItemQty(1);
      } else {
        // Product not found, prompt manual entry
        alert("Item not found. Opening manual entry.");
        setScannedProduct({ name: "", brand: "", barcode: barcode, image: null });
        setNewItemQty(1);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Could not fetch product details. Try manual entry.");
    }
  };

  // 3. Save to Firebase (Add Item)
  const confirmAddItem = async () => {
    if (!scannedProduct || !scannedProduct.name) return;

    try {
      await addDoc(collection(db, "pantry"), {
        name: scannedProduct.name,
        barcode: scannedProduct.barcode || "MANUAL",
        image: scannedProduct.image,
        brand: scannedProduct.brand,
        quantity: parseInt(newItemQty),
        addedAt: serverTimestamp(),
      });
      
      // Close modal and reset
      setScannedProduct(null);
    } catch (error) {
      console.error("Error adding doc:", error);
      alert("Failed to save item.");
    }
  };

  // 4. Delete Item
  const handleDelete = async (id) => {
    if (confirm("Remove this item from pantry?")) {
      await deleteDoc(doc(db, "pantry", id));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            My Pantry 🍎
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {items.length} items in stock
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Manual Add Button */}
          <button
            onClick={() => {
              setScannedProduct({ name: "", brand: "", image: null });
              setNewItemQty(1);
            }}
            className="text-sm font-semibold text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            + Add Manually
          </button>

          {/* Scan Button */}
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg transition-all transform hover:scale-105"
          >
            <span className="text-xl">📷</span>
            <span className="font-bold hidden md:inline">Scan</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Pantry Items */}
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
              <div className="h-16 w-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 dark:text-white truncate text-lg">
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
                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* --- OVERLAYS --- */}

      {/* 1. Barcode Scanner Component */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* 2. Add/Edit Item Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100">
            
            <div className="text-center mb-6">
              {/* Image Preview or Emoji Placeholder */}
              <div className="mx-auto h-24 w-24 mb-4 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-600 shadow-md">
                {scannedProduct.image ? (
                  <img src={scannedProduct.image} alt="Scanned" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl">✏️</span>
                )}
              </div>

              {/* Editable Name Input */}
              <input 
                type="text"
                placeholder="Item Name (e.g. Milk)"
                value={scannedProduct.name}
                onChange={(e) => setScannedProduct({ ...scannedProduct, name: e.target.value })}
                className="w-full text-center text-xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none mb-2 pb-1 placeholder-gray-300"
                autoFocus={!scannedProduct.name} 
              />

              {/* Editable Brand Input */}
              <input 
                type="text"
                placeholder="Brand (Optional)"
                value={scannedProduct.brand || ""}
                onChange={(e) => setScannedProduct({ ...scannedProduct, brand: e.target.value })}
                className="w-full text-center text-sm text-gray-500 dark:text-gray-400 bg-transparent border-none focus:ring-0 placeholder-gray-300"
              />
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button 
                onClick={() => setNewItemQty(Math.max(1, newItemQty - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                -
              </button>
              <span className="text-2xl font-bold text-gray-800 dark:text-white w-8 text-center">
                {newItemQty}
              </span>
              <button 
                onClick={() => setNewItemQty(newItemQty + 1)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                +
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setScannedProduct(null)}
                className="py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!scannedProduct.name} 
                onClick={confirmAddItem}
                className="py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

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