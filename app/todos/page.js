'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import TodoItem from '@/components/TodoItem';
import { useTodos } from '@/hooks/useFirebase';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTimes, FaFilter } from 'react-icons/fa';
import { ICON_CATEGORIES, getIcon } from '@/lib/icons';

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High Priority', icon: '🔴', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'medium', label: 'Medium Priority', icon: '🟡', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'low', label: 'Low Priority', icon: '🔵', color: 'bg-blue-100 text-blue-800 border-blue-300' },
];

function TodosContent() {
  const { todos, loading, addTodo } = useTodos();
  const { members } = useFamily();
  const { userData } = useAuth();
  const { currentTheme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMember, setFilterMember] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('date');
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

  // Filter and sort todos
  const filteredTodos = todos.filter(todo => {
    if (filterMember !== 'all' && todo.assignedTo !== filterMember) return false;
    if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
    return true;
  });

  const sortTodos = (todosToSort) => {
    return [...todosToSort].sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      }
      // Sort by date (newest first)
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
  };

  const activeTodos = sortTodos(filteredTodos.filter(t => !t.completed));
  const completedTodos = filteredTodos.filter(t => t.completed);

  const allActiveTodos = todos.filter(t => !t.completed);
  const allCompletedTodos = todos.filter(t => t.completed);

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
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Dark Deeds' : 'Family To-Dos'}
              </span>
            </h1>
            <p className={`${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-semibold`}>
              {allActiveTodos.length} {currentTheme === 'dark' ? 'cursed' : 'active'} • {allCompletedTodos.length} {currentTheme === 'dark' ? 'vanquished' : 'completed'}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            aria-label={currentTheme === 'dark' ? 'Cast Curse' : 'Add Todo'}
          >
            <FaPlus /> <span className="hidden sm:inline">{currentTheme === 'dark' ? 'Cast Curse' : 'Add Todo'}</span>
          </button>
        </div>

        {/* Filters and Sort - Collapsible on Mobile */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all"
          >
            <div className="flex items-center gap-2">
              <FaFilter className="text-purple-500" />
              <h3 className="font-bold text-gray-800">Filter & Sort</h3>
              {(filterMember !== 'all' || filterPriority !== 'all') && (
                <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>
            <motion.div
              animate={{ rotate: showFilters ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <FaFilter className="text-gray-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                        Assigned To
                      </label>
                      <select
                        value={filterMember}
                        onChange={(e) => setFilterMember(e.target.value)}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      >
                        <option value="all">All Members</option>
                        {members.map(member => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🔵 Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      >
                        <option value="date">Date Created</option>
                        <option value="priority">Priority</option>
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Todos */}
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
          <span>{currentTheme === 'dark' ? '💀' : '🔥'}</span> {currentTheme === 'dark' ? 'Active Hexes' : 'Active Tasks'}
          {activeTodos.length > 0 && (
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
              {activeTodos.length}
            </span>
          )}
        </h2>

        {activeTodos.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-xl font-bold text-gray-600">
              {filterMember !== 'all' || filterPriority !== 'all'
                ? 'No todos match your filters'
                : 'All done!'}
            </p>
            <p className="text-gray-500">
              {filterMember !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'No active todos right now'}
            </p>
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
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
              {completedTodos.length}
            </span>
          </h2>
          <div className="space-y-3 opacity-70">
            {completedTodos.slice(0, 5).map(todo => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
          {completedTodos.length > 5 && (
            <p className="text-center text-gray-500 mt-4 text-sm">
              + {completedTodos.length - 5} more completed tasks
            </p>
          )}
        </div>
      )}

      {/* Add Todo Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-2xl w-full shadow-2xl my-4 md:my-8 max-h-[95vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-2xl md:text-3xl font-display font-bold gradient-text">
                  ✨ Add New Todo
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleAddTodo} className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    What needs to be done?
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    placeholder="e.g., Take out the trash, Do homework"
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
                    onChange={(e) => setNewTodo({ ...newTodo, assignedTo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold bg-white"
                    required
                  >
                    <option value="">Select a family member...</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {PRIORITY_OPTIONS.map(priority => (
                      <button
                        key={priority.value}
                        type="button"
                        onClick={() => setNewTodo({ ...newTodo, priority: priority.value })}
                        className={`p-3 md:p-4 rounded-xl border-2 transition-all text-center ${
                          newTodo.priority === priority.value
                            ? 'border-purple-500 bg-purple-50 scale-105'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-xl md:text-2xl mb-1">{priority.icon}</div>
                        <div className="text-xs md:text-sm font-bold text-gray-700">{priority.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Choose an icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICON_CATEGORIES.status.concat(ICON_CATEGORIES.fun).slice(0, 12).map(icon => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => setNewTodo({ ...newTodo, iconId: icon.id })}
                        className={`p-2 md:p-3 text-xl md:text-2xl rounded-xl border-2 transition-all ${
                          newTodo.iconId === icon.id
                            ? 'border-purple-500 bg-purple-50 scale-110'
                            : 'border-gray-200 hover:border-purple-300'
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
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <FaPlus /> Add Todo
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
