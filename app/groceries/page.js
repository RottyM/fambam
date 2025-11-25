'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useGroceries } from '@/hooks/useFirestore';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaCheckCircle } from 'react-icons/fa';

const CATEGORIES = {
  produce: { name: 'Produce', icon: '🥬', color: 'from-green-400 to-green-500' },
  dairy: { name: 'Dairy', icon: '🥛', color: 'from-blue-400 to-blue-500' },
  meat: { name: 'Meat & Seafood', icon: '🍖', color: 'from-red-400 to-red-500' },
  frozen: { name: 'Frozen', icon: '🧊', color: 'from-cyan-400 to-cyan-500' },
  pantry: { name: 'Pantry', icon: '🥫', color: 'from-yellow-400 to-yellow-500' },
  bakery: { name: 'Bakery', icon: '🍞', color: 'from-orange-400 to-orange-500' },
  snacks: { name: 'Snacks', icon: '🍿', color: 'from-purple-400 to-purple-500' },
  beverages: { name: 'Beverages', icon: '🥤', color: 'from-pink-400 to-pink-500' },
  other: { name: 'Other', icon: '🛒', color: 'from-gray-400 to-gray-500' },
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
  const { theme } = useTheme();

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
          <div className="text-6xl mb-4 animate-bounce">🛒</div>
          <p className="text-xl font-bold text-purple-600">Loading groceries...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className="gradient-text">Grocery List</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-semibold">
              {uncheckedCount} items to buy
              {checkedCount > 0 && ` • ${checkedCount} checked`}
            </p>
          </div>

          <div className="flex gap-2">
            {groceries.length > 0 && (
              <>
                {checkedCount > 0 && (
                  <button
                    onClick={clearCheckedItems}
                    className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-2 rounded-xl font-bold hover:from-red-600 hover:to-rose-600 transition-all shadow-md flex items-center gap-2"
                  >
                    <FaTrash size={14} /> <span className="hidden md:inline">Clear Checked ({checkedCount})</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Clear ALL ${groceries.length} items? This cannot be undone.`)) {
                      clearAllItems();
                    }
                  }}
                  className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-4 py-2 rounded-xl font-bold hover:from-slate-700 hover:to-gray-800 transition-all shadow-md flex items-center gap-2"
                >
                  <FaTrash size={14} /> <span className="hidden md:inline">Clear All ({groceries.length})</span>
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-green-500 to-blue-500 text-white w-10 h-10 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
              aria-label="Add Item"
            >
              <FaPlus size={14} />
            </button>
          </div>
        </div>
      </div>

      {groceries.length === 0 ? (
        <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
          <div className="text-6xl mb-4">🛒</div>
          <p className={`text-xl font-bold ${theme.colors.textMuted}`}>No items yet</p>
          <p className={theme.colors.textMuted}>Click "Add Item" to start your grocery list</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(CATEGORIES).map(([categoryKey, categoryInfo]) => {
            const items = groupedGroceries[categoryKey] || [];
            if (items.length === 0) return null;

            return (
              <motion.div
                key={categoryKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${theme.colors.bgCard} rounded-3xl p-6 shadow-lg border ${theme.colors.border}`}
              >
                <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${categoryInfo.color} text-white px-4 py-2 rounded-full mb-4 font-bold shadow-md`}>
                  <span className="text-2xl">{categoryInfo.icon}</span>
                  <span>{categoryInfo.name}</span>
                  <span className="bg-white/30 px-2 py-0.5 rounded-full text-sm">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {items.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${theme.colors.bgCard} ${theme.colors.border} ${
                        item.checked
                          ? 'opacity-60'
                          : 'hover:border-purple-400 hover:shadow-md'
                      }`}
                    >
                      <button
                        onClick={() => toggleGroceryItem(item.id, item.checked)}
                        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          item.checked
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-400 hover:border-green-500'
                        }`}
                      >
                        {item.checked && <FaCheckCircle className="text-white text-sm" />}
                      </button>

                      <div className="flex-1">
                        <p className={`font-bold ${item.checked ? 'line-through text-gray-400 dark:text-gray-500' : theme.colors.text}`}>
                          {item.name}
                        </p>
                        {item.quantity && (
                          <p className="text-base text-gray-700 dark:text-gray-300">{item.quantity}</p>
                        )}
                      </div>

                      <button
                        onClick={() => deleteGroceryItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg bg-transparent hover:bg-red-50 dark:hover:bg-transparent transition-colors"
                      >
                        <FaTrash />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-8 max-w-md w-full shadow-2xl`}
            >
              <h2 className="text-3xl font-display font-bold mb-6 gradient-text">
                🛒 Add Item
              </h2>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Milk, Eggs, Bread..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Quantity (optional)
                  </label>
                  <input
                    type="text"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="2 lbs, 1 dozen, etc."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, category: key })}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          newItem.category === key
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.icon}</div>
                        <div className="text-xs font-bold text-gray-700">{cat.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-blue-600 transition-all shadow-lg"
                  >
                    Add Item
                  </button>
                </div>
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
