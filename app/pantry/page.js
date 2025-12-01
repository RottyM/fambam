'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { usePantry } from '@/hooks/useFirestore';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa';

const CATEGORIES = {
  produce: { name: 'Produce', icon: "🥬", color: 'from-green-400 to-green-500' },
  dairy: { name: 'Dairy', icon: "🥛", color: 'from-blue-400 to-blue-500' },
  meat: { name: 'Meat & Seafood', icon: "🍖", color: 'from-red-400 to-red-500' },
  frozen: { name: 'Frozen', icon: "🧊", color: 'from-cyan-400 to-cyan-500' },
  pantry: { name: 'Pantry', icon: "🥫", color: 'from-yellow-400 to-yellow-500' },
  bakery: { name: 'Bakery', icon: "🍞", color: 'from-orange-400 to-orange-500' },
  snacks: { name: 'Snacks', icon: "🍿", color: 'from-purple-400 to-purple-500' },
  beverages: { name: 'Beverages', icon: "🥤", color: 'from-pink-400 to-pink-500' },
  condiments: { name: 'Condiments & Spices', icon: "🧂", color: 'from-amber-400 to-red-500' },
  canned: { name: 'Canned & Jarred', icon: "🥫", color: 'from-emerald-400 to-emerald-600' },
  baking: { name: 'Baking & Staples', icon: "🧀", color: 'from-yellow-400 to-orange-500' },
  household: { name: 'Household & Paper', icon: "🧻", color: 'from-slate-400 to-slate-600' },
  other: { name: 'Other', icon: "📦", color: 'from-gray-400 to-gray-500' },
};

function EditablePantryItem({ item, theme, currentTheme, remove, update, catInfo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({ name: item.name, quantity: item.quantity || '' });

  // Check for image URL (supports common field names)
  const itemImage = item.image || item.imageUrl || item.photo || null;

  const handleSave = () => {
    if (tempData.name !== item.name || tempData.quantity !== item.quantity) {
      update(item.id, tempData);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  // --- EDIT MODE ---
  if (isEditing) {
    return (
      <div className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl border-2 shadow-lg relative ${
        currentTheme === 'dark' ? 'bg-gray-800 border-purple-500/50' : 'bg-white border-purple-400'
      }`}>
        <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">EDITING</div>
        
        {/* Placeholder Icon while editing */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
           currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
           ✏️
        </div>

        <div className="flex-1 flex gap-3 min-w-0">
          <input
            autoFocus
            className={`flex-1 bg-transparent border-b-2 border-transparent focus:border-purple-500 focus:outline-none font-bold ${
              currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
            value={tempData.name}
            onChange={(e) => setTempData({ ...tempData, name: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Item name"
          />
          <input
            className={`w-20 bg-transparent border-b-2 border-transparent focus:border-purple-500 focus:outline-none text-right ${
              currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}
            value={tempData.quantity}
            onChange={(e) => setTempData({ ...tempData, quantity: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Qty"
          />
        </div>

        <button onClick={handleSave} className="flex-shrink-0 p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:scale-105 transition-all">
          <FaSave size={14} />
        </button>
      </div>
    );
  }

  // --- VIEW MODE ---
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      whileHover={{ scale: 1.01 }}
      className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl border-2 transition-all ${
        currentTheme === 'dark' 
          ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' 
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* 1. PRODUCT PHOTO OR CATEGORY ICON */}
      {itemImage ? (
        <img 
          src={itemImage} 
          alt={item.name}
          className="flex-shrink-0 w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm bg-white"
        />
      ) : (
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
          currentTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {catInfo.icon}
        </div>
      )}

      {/* 2. TEXT CONTENT (Full Wrap) */}
      <div 
        className="flex-1 min-w-0 cursor-pointer group select-none" 
        onClick={() => setIsEditing(true)}
        title="Double click to edit"
      >
        <div className={`font-bold text-base leading-tight break-words pr-2 ${
          currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {item.name}
          {/* Edit Pencil Hint */}
          <span className="opacity-0 group-hover:opacity-50 text-[10px] text-purple-500 ml-2 align-middle">
            ✎
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${
             currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {catInfo.name}
          </span>
          {item.quantity && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
              currentTheme === 'dark' 
                ? 'bg-purple-900/30 text-purple-300' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {item.quantity}
            </span>
          )}
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => remove(item.id)}
        className={`flex-shrink-0 p-3 rounded-xl transition-colors ${
          currentTheme === 'dark' ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'
        }`}
      >
        <FaTrash size={16} />
      </motion.button>
    </motion.div>
  );
}

function PantryContent() {
  const { pantryItems, loading, addPantryItem, updatePantryItem, deletePantryItem } = usePantry();
  const { theme, currentTheme } = useTheme();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'other', quantity: '' });

  const handleAddItem = async (e) => {
    e.preventDefault();
    await addPantryItem(newItem);
    setNewItem({ name: '', category: 'other', quantity: '' });
    setShowAddModal(false);
  };

  const groupedPantry = useMemo(() => {
    return pantryItems.reduce((acc, item) => {
      const category = item.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});
  }, [pantryItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🥫</div>
          <p className="text-xl font-bold text-purple-500">Loading Pantry...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                Pantry Vault
              </span>
            </h1>
            <p className={`text-sm sm:text-base font-semibold ${theme.colors.textMuted}`}>
              {pantryItems.length} items stocked
            </p>
          </div>
          
          <div className="flex gap-2">
             <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2"
            >
              <FaPlus /> Add Item
            </motion.button>
          </div>
        </div>

        {pantryItems.length === 0 ? (
          <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${
            currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="text-6xl mb-4">👻</div>
            <p className="font-bold text-xl opacity-50">Your pantry is empty!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(CATEGORIES).map(([catKey, catData]) => {
              const items = groupedPantry[catKey] || [];
              if (items.length === 0) return null;

              return (
                <motion.div 
                  key={catKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${theme.colors.bgCard} rounded-3xl p-5 shadow-lg border ${theme.colors.border}`}
                >
                  <div className="flex items-center gap-3 mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
                    <div className="text-3xl">{catData.icon}</div>
                    <h3 className={`text-xl font-bold ${
                      currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {catData.name}
                    </h3>
                    <span className="ml-auto text-xs font-bold bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full opacity-60">
                      {items.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {items.map(item => (
                      <EditablePantryItem
                        key={item.id}
                        item={item}
                        theme={theme}
                        currentTheme={currentTheme}
                        remove={deletePantryItem}
                        update={updatePantryItem}
                        catInfo={catData}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 w-full max-w-md shadow-2xl border ${theme.colors.border}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold gradient-text">Stock Pantry</h2>
                <button onClick={() => setShowAddModal(false)}><FaTimes size={20} /></button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <input
                  autoFocus
                  placeholder="Item Name (e.g. Rice)"
                  className={`w-full p-4 rounded-xl border-2 bg-transparent text-lg font-bold outline-none ${
                    currentTheme === 'dark' ? 'text-white border-gray-700 focus:border-purple-500' : 'text-gray-900 border-gray-200 focus:border-purple-500'
                  }`}
                  value={newItem.name}
                  onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                />
                <input
                  placeholder="Quantity (e.g. 2 bags)"
                  className={`w-full p-4 rounded-xl border-2 bg-transparent outline-none ${
                    currentTheme === 'dark' ? 'text-white border-gray-700 focus:border-purple-500' : 'text-gray-900 border-gray-200 focus:border-purple-500'
                  }`}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                />
                
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewItem({...newItem, category: key})}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
                        newItem.category === key 
                          ? 'bg-purple-100 border-purple-500 text-purple-700' 
                          : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      {cat.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg mt-4">
                  Add to Stock
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function PantryPage() {
  return (
    <DashboardLayout>
      <PantryContent />
    </DashboardLayout>
  );
}