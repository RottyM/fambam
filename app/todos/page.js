'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import TodoItem from '@/components/TodoItem';
import { useTodos } from '@/hooks/useFirestore';
import { useFamily } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTimes, FaFilter, FaUser, FaArrowUp, FaMinus, FaArrowDown, FaSortAmountDownAlt } from 'react-icons/fa';
import UserAvatar from '@/components/UserAvatar';
import { ICON_CATEGORIES, getIcon } from '@/lib/icons';

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High Priority', Icon: FaArrowUp, light: 'bg-red-50 text-red-700 border-red-200', dark: 'bg-red-950/40 text-red-200 border-red-800/60' },
  { value: 'medium', label: 'Medium Priority', Icon: FaMinus, light: 'bg-amber-50 text-amber-700 border-amber-200', dark: 'bg-amber-950/40 text-amber-200 border-amber-800/60' },
  { value: 'low', label: 'Low Priority', Icon: FaArrowDown, light: 'bg-blue-50 text-blue-700 border-blue-200', dark: 'bg-blue-950/40 text-blue-200 border-blue-800/60' },
];

function TodosContent() {
  const { todos, loading, addTodo, toggleTodo, updateTodo, deleteTodo } = useTodos();
  const { members } = useFamily();
  const { userData } = useAuth();
  const { theme, currentTheme } = useTheme();
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

  const filteredTodos = todos.filter(todo => {
    if (filterMember !== 'all' && todo.assignedTo !== filterMember) return false;
    if (filterPriority !== 'all' && todo.priority !== filterPriority) return false;
    return true;
  });
  const pillBase = 'px-4 py-2 rounded-full border-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap';
  const pillActive = 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300 shadow-lg';
  const pillInactive = currentTheme === 'dark'
    ? 'bg-gray-800 text-gray-200 border-gray-700 hover:border-purple-400'
    : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-purple-300';

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
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Dark Deeds' : 'Family To-Dos'}
              </span>
            </h1>
            <p className={`${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-semibold`}>
              {allActiveTodos.length} {currentTheme === 'dark' ? 'cursed' : 'active'} / {allCompletedTodos.length} {currentTheme === 'dark' ? 'vanquished' : 'completed'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 md:px-5 py-3 rounded-2xl text-base font-bold transition-all shadow-sm border ${
                showFilters
                  ? 'bg-purple-500 border-purple-500 text-white'
                  : currentTheme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FaFilter /> Filters
              {(filterMember !== 'all' || filterPriority !== 'all') && (
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
                  Active
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              aria-label={currentTheme === 'dark' ? 'Cast Curse' : 'Add Todo'}
            >
              <FaPlus /> <span className="hidden sm:inline">{currentTheme === 'dark' ? 'Cast Curse' : 'Add Todo'}</span>
            </button>
          </div>
        </div>

        {/* Filters and Sort - Calendar-style */}
        <div className="mb-6">
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="flex flex-col gap-3 pt-2">
                  <div>
                    <label className={`text-xs font-bold mb-2 block ml-1 ${theme.colors.textMuted}`}>Assigned To</label>
                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => setFilterMember('all')}
                          className={`${pillBase} ${filterMember === 'all' ? pillActive : pillInactive}`}
                        >
                          <FaUser size={14} /> <span>All</span>
                        </button>
                        {members.map(member => (
                          <button
                            key={member.id}
                            onClick={() => setFilterMember(member.id)}
                            className={`${pillBase} ${filterMember === member.id ? pillActive : pillInactive}`}
                          >
                            <UserAvatar user={member} size={24} />
                            <span>{member.displayName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs font-bold mb-2 block ml-1 ${theme.colors.textMuted}`}>Priority</label>
                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => setFilterPriority('all')}
                          className={`${pillBase} ${filterPriority === 'all' ? pillActive : pillInactive}`}
                        >
                          <FaFilter size={14} /> <span>All</span>
                        </button>
                        {PRIORITY_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => setFilterPriority(option.value)}
                            className={`${pillBase} ${filterPriority === option.value ? pillActive : pillInactive}`}
                          >
                            <option.Icon size={14} />
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs font-bold mb-2 block ml-1 ${theme.colors.textMuted}`}>Sort By</label>
                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                      <div className="flex gap-3 shrink-0">
                        <button
                          onClick={() => setSortBy('date')}
                          className={`${pillBase} ${sortBy === 'date' ? pillActive : pillInactive}`}
                        >
                          <FaSortAmountDownAlt size={14} />
                          <span>Newest</span>
                        </button>
                        <button
                          onClick={() => setSortBy('priority')}
                          className={`${pillBase} ${sortBy === 'priority' ? pillActive : pillInactive}`}
                        >
                          <FaArrowUp size={14} />
                          <span>Priority</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Todos */}
        <div className="space-y-4 mb-8">
          <h2 className={`text-2xl font-bold ${theme.colors.text}`}> {currentTheme === 'dark' ? 'Cursed' : 'Active Tasks'}</h2>
          {activeTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              members={members}
              userId={userData?.uid}
              onToggle={() => toggleTodo(todo.id, todo.completed)}
              onUpdate={updateTodo}
              onDelete={deleteTodo}
            />
          ))}
        </div>

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div className="space-y-4">
            <h2 className={`text-2xl font-bold ${theme.colors.textMuted}`}>
              {currentTheme === 'dark' ? 'Vanquished' : 'Completed'} ({completedTodos.length})
            </h2>
            {completedTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                members={members}
                userId={userData?.uid}
                onToggle={() => toggleTodo(todo.id, todo.completed)}
                onUpdate={updateTodo}
                onDelete={deleteTodo}
              />
            ))}
          </div>
        )}

        {filteredTodos.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-6xl mb-4">✅</p>
            <p className="text-xl font-bold">All done!</p>
            <p>Add a new todo to get started!</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto border ${theme.colors.border}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold gradient-text">Add New Todo</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className={`p-2 rounded-xl transition-colors ${currentTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleAddTodo} className="space-y-6">
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    What needs to be done?
                  </label>
                  <input
                    type="text"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    placeholder="e.g., Take out the trash, Do homework"
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Assign to
                  </label>
                  <select
                    value={newTodo.assignedTo}
                    onChange={(e) => setNewTodo({ ...newTodo, assignedTo: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
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
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
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
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 scale-105'
                            : `${theme.colors.border} hover:border-purple-300 dark:hover:border-purple-700`
                        }`}
                      >
                        <div className="text-xl md:text-2xl mb-1 flex items-center justify-center">
                          <priority.Icon size={22} />
                        </div>
                        <div className={`text-xs md:text-sm font-bold ${theme.colors.text}`}>{priority.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
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
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 scale-110'
                            : `${theme.colors.border} hover:border-purple-300 dark:hover:border-purple-700`
                        }`}
                      >
                        {getIcon(icon.id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    value={newTodo.dueDate}
                    onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.border} focus:border-purple-500`}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 ${theme.colors.bgSecondary} ${theme.colors.text} py-3 rounded-xl font-bold hover:opacity-80 transition-all`}
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



