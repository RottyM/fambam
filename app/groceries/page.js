'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useGroceries } from '@/hooks/useFirestore';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaCheckCircle, FaTimes } from 'react-icons/fa';

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
  other: { name: 'Other', icon: "🛒", color: 'from-gray-400 to-gray-500' },
};

function GroceriesContent() {
  const {
    groceries,
    loading,
    addGroceryItem,
    toggleGroceryItem,
    deleteGroceryItem,
    clearCheckedItems,
    clearAllItems,
  } = useGroceries();
  const { theme, currentTheme } = useTheme();
  const { showConfirmation } = useConfirmation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'other',
    quantity: '',
  });

  const handleAddItem = async (e) => {
    e.preventDefault();
    await addGroceryItem(newItem);
    setNewItem({ name: '', category: 'other', quantity: '' });
    setShowAddModal(false);
  };

  // Group groceries by category
  const groupedGroceries = groceries.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const uncheckedCount = groceries.filter(item => !item.checked).length;
  const checkedCount = groceries.filter(item => item.checked).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-6xl mb-4"
          >
            🛒
          </motion.div>
          <p className={`text-xl font-bold ${currentTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            Loading groceries...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Dark Provisions' : 'Grocery List'}
              </span>
            </h1>
            <p className={`text-sm sm:text-base font-semibold ${theme.colors.textMuted}`}>
              {uncheckedCount} items to buy
              {checkedCount > 0 && ` • ${checkedCount} in cart`}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            {groceries.length > 0 && (
              <>
                {checkedCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearCheckedItems}
                    className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <FaTrash size={14} /> <span className="hidden md:inline">Clear Checked ({checkedCount})</span>
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    showConfirmation({
                      title: 'Clear All Groceries',
                      message: `Are you sure you want to clear all ${groceries.length} items? This cannot be undone.`,
                      onConfirm: clearAllItems,
                    });
                  }}
                  className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-4 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <FaTrash size={14} /> <span className="hidden md:inline">Clear All ({groceries.length})</span>
                </motion.button>
              </>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FaPlus size={14} /> <span className="hidden md:inline">Add Item</span>
            </motion.button>
          </div>
        </div>

        {groceries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center py-16 rounded-3xl border-2 border-dashed ${
              currentTheme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="text-7xl mb-4">🛒</div>
            <p className={`text-xl font-bold mb-2 ${theme.colors.text}`}>
              Your list is empty!
            </p>
            <p className={`${theme.colors.textMuted} mb-6`}>
              Start adding items to your grocery list
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Add First Item
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(CATEGORIES).map(([catKey, catData]) => {
              const items = groupedGroceries[catKey] || [];
              if (items.length === 0) return null;

              return (
                <motion.div
                  key={catKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${theme.colors.bgCard} rounded-3xl p-4 md:p-6 shadow-lg border ${theme.colors.border}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`text-3xl md:text-4xl bg-gradient-to-r ${catData.color} p-3 rounded-2xl shadow-md`}>
                      {catData.icon}
                    </div>
                    <div>
                      <h3 className={`text-xl md:text-2xl font-bold ${theme.colors.text}`}>
                        {catData.name}
                      </h3>
                      <p className={`text-sm ${theme.colors.textMuted}`}>
                        {items.filter(i => !i.checked).length} items
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        whileHover={{ scale: 1.02 }}
                        className={`flex items-center gap-3 p-3 md:p-4 rounded-2xl border-2 transition-all ${
                          item.checked
                            ? currentTheme === 'dark'
                              ? 'bg-green-900/20 border-green-700/50'
                              : 'bg-green-50 border-green-200'
                            : currentTheme === 'dark'
                              ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleGroceryItem(item.id, !item.checked)}
                          className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                            item.checked
                              ? 'bg-green-500 border-green-500 text-white'
                              : currentTheme === 'dark'
                                ? 'border-gray-600 hover:border-green-400'
                                : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {item.checked && <FaCheckCircle size={14} />}
                        </motion.button>

                        <div className="flex-1 min-w-0">
                          <div className={`font-bold ${
                            item.checked
                              ? 'line-through opacity-60'
                              : theme.colors.text
                          }`}>
                            {item.name}
                          </div>
                          {item.quantity && (
                            <div className={`text-sm ${
                              item.checked
                                ? 'line-through opacity-50'
                                : theme.colors.textMuted
                            }`}>
                              {item.quantity}
                            </div>
                          )}
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteGroceryItem(item.id)}
                          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                            currentTheme === 'dark'
                              ? 'text-red-400 hover:bg-red-900/30'
                              : 'text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <FaTrash size={14} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-md w-full shadow-2xl border ${theme.colors.border} overflow-y-auto max-h-[90vh]`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl md:text-3xl font-bold ${currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}`}>
                  Add Item
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`p-2 rounded-xl transition-colors ${
                    currentTheme === 'dark'
                      ? 'text-gray-400 hover:bg-gray-700'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <FaTimes size={20} />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.colors.textMuted}`}>
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g., Milk"
                    required
                    className={`w-full px-4 py-3 rounded-2xl border-2 focus:border-purple-500 focus:outline-none font-semibold transition-all ${
                      currentTheme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.colors.textMuted}`}>
                    Quantity (optional)
                  </label>
                  <input
                    type="text"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="e.g., 1 gallon"
                    className={`w-full px-4 py-3 rounded-2xl border-2 focus:border-purple-500 focus:outline-none font-semibold transition-all ${
                      currentTheme === 'dark'
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${theme.colors.textMuted}`}>
                    Category *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <motion.button
                        key={key}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewItem({ ...newItem, category: key })}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          newItem.category === key
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : currentTheme === 'dark'
                              ? 'border-gray-700 hover:border-gray-600'
                              : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl">{cat.icon}</div>
                        <div className={`text-[10px] font-bold ${theme.colors.text}`}>
                          {cat.name}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Add to List
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function GroceriesPage() {
  return (
    <DashboardLayout>
      <GroceriesContent />
    </DashboardLayout>
  );
}