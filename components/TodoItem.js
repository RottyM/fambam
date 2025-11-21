'use client';

import { motion } from 'framer-motion';
import { getIcon } from '@/lib/icons';
import UserAvatar from './UserAvatar';
import { useFamily } from '@/contexts/FamilyContext';
import { useTodos } from '@/hooks/useFirestore';
import { FaTrash, FaFlag } from 'react-icons/fa';
import { format, isPast, isToday, isTomorrow, parseISO } from 'date-fns';

export default function TodoItem({ todo }) {
  const { getMemberById, isParent } = useFamily();
  const { toggleTodo, deleteTodo } = useTodos();
  const assignedMember = getMemberById(todo.assignedTo);

  const handleToggle = () => {
    toggleTodo(todo.id, todo.completed);
  };

  const handleDelete = () => {
    if (confirm('Delete this todo?')) {
      deleteTodo(todo.id);
    }
  };

  // Handle different date formats (string or Firestore Timestamp)
  const getDueDate = () => {
    if (!todo.dueDate) return null;

    // If it's a Firestore Timestamp
    if (todo.dueDate.seconds) {
      return new Date(todo.dueDate.seconds * 1000);
    }

    // If it's a string date
    if (typeof todo.dueDate === 'string') {
      return parseISO(todo.dueDate);
    }

    // If it's already a Date object
    if (todo.dueDate instanceof Date) {
      return todo.dueDate;
    }

    return null;
  };

  const dueDate = getDueDate();

  const getDueDateLabel = () => {
    if (!dueDate) return null;

    if (isToday(dueDate)) return 'Due Today';
    if (isTomorrow(dueDate)) return 'Due Tomorrow';
    if (isPast(dueDate) && !todo.completed) return 'Overdue';
    return `Due ${format(dueDate, 'MMM d')}`;
  };

  const getDueDateColor = () => {
    if (!dueDate || todo.completed) return 'text-gray-500';
    if (isPast(dueDate)) return 'text-red-600';
    if (isToday(dueDate)) return 'text-orange-600';
    if (isTomorrow(dueDate)) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const getPriorityColor = () => {
    switch (todo.priority) {
      case 'high':
        return 'border-red-400';
      case 'medium':
        return 'border-yellow-400';
      case 'low':
        return 'border-blue-400';
      default:
        return 'border-purple-400';
    }
  };

  const getPriorityBadge = () => {
    if (!todo.priority || todo.priority === 'medium') return null;

    const colors = {
      high: 'bg-red-100 text-red-800',
      low: 'bg-blue-100 text-blue-800',
    };

    const icons = {
      high: '🔴',
      low: '🔵',
    };

    return (
      <span className={`${colors[todo.priority]} px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
        {icons[todo.priority]} {todo.priority}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all border-l-4 ${
        todo.completed ? 'border-green-400' : getPriorityColor()
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Custom checkbox */}
        <button
          onClick={handleToggle}
          className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
            todo.completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-purple-400 hover:scale-110'
          }`}
        >
          {todo.completed && <span className="text-white text-xl">✓</span>}
        </button>

        {/* Icon */}
        <div className="flex-shrink-0 text-3xl">
          {getIcon(todo.iconId || 'default')}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`font-bold text-lg ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {todo.title}
            </h4>
            {getPriorityBadge()}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {assignedMember && (
              <div className="flex items-center gap-2">
                <UserAvatar user={assignedMember} size={24} />
                <span className="text-sm text-gray-600 font-semibold">
                  {assignedMember.displayName}
                </span>
              </div>
            )}

            {dueDate && (
              <div className={`flex items-center gap-1 text-sm font-bold ${getDueDateColor()}`}>
                📅 {getDueDateLabel()}
              </div>
            )}
          </div>
        </div>

        {/* Delete button for parents */}
        {isParent() && (
          <button
            onClick={handleDelete}
            className="flex-shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all p-2 rounded-lg"
          >
            <FaTrash size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
