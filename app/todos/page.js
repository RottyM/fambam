'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import TodoItem from '@/components/TodoItem';
import { useTodos } from '@/hooks/useFirebase';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus } from 'react-icons/fa';
import { ICON_CATEGORIES, getIcon } from '@/lib/icons';

function TodosContent() {
  const { todos, loading, addTodo } = useTodos();
  const { members } = useFamily();
  const { userData } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    assignedTo: '',
    iconId: 'default',
    priority: 'medium',
    dueDate: '',
  });

  const handleAddTodo = async (e) => {
    e.preventDefault();
    await addTodo(newTodo);
    setShowAddModal(false);
    setNewTodo({
      title: '',
      assignedTo: '',
      iconId: 'default',
      priority: 'medium',
      dueDate: '',
    });
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✅</div>
          <p className="text-xl font-bold text-purple-600">Loading todos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Family To-Dos</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-semibold">
            {activeTodos.length} active • {completedTodos.length} completed
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 sm:px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <FaPlus /> Add Todo
        </button>
      </div>

      {/* Active Todos */}
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
          <span>🔥</span> Active Tasks
        </h2>
        
        {activeTodos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-xl font-bold text-gray-600">All done!</p>
            <p className="text-gray-500">No active todos right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {activeTodos.map(todo => (
                <TodoItem key={todo.id} todo={todo} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Completed Todos */}
      {completedTodos.length > 0 && (
        <div>
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <span>✅</span> Completed
          </h2>
          <div className="space-y-3 opacity-70">
            {completedTodos.slice(0, 5).map(todo => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </div>
      )}

      {/* Add Todo Modal */}
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
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl sm:text-3xl font-display font-bold mb-4 sm:mb-6 gradient-text">
                ✨ Add New Todo
              </h2>

              <form onSubmit={handleAddTodo} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    What needs to be done?
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                    placeholder="e.g., Take out the trash"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Assign to
                  </label>
                  <select
                    value={newTodo.assignedTo}
                    onChange={(e) => setNewTodo({...newTodo, assignedTo: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  >
                    <option value="">Select a family member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Choose an icon
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {ICON_CATEGORIES.status.concat(ICON_CATEGORIES.fun).slice(0, 12).map(icon => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setNewTodo({...newTodo, iconId: icon.id})}
                        className={`p-2 sm:p-3 text-xl sm:text-2xl rounded-xl border-2 transition-all touch-manipulation ${
                          newTodo.iconId === icon.id
                            ? 'border-purple-500 bg-purple-50 scale-110'
                            : 'border-gray-200 hover:border-purple-300 active:border-purple-400'
                        }`}
                      >
                        {getIcon(icon.id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({...newTodo, dueDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 sm:py-3 rounded-xl font-bold hover:bg-gray-300 active:bg-gray-400 transition-all touch-manipulation min-h-[48px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 sm:py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 transition-all shadow-lg touch-manipulation min-h-[48px]"
                  >
                    Add Todo
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

export default function TodosPage() {
  return (
    <DashboardLayout>
      <TodosContent />
    </DashboardLayout>
  );
}
