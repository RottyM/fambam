'use client';

import { motion } from 'framer-motion';
import { getIcon } from '@/lib/icons';
import UserAvatar from './UserAvatar';
import { useFamily } from '@/contexts/FamilyContext';
import { useTodos } from '@/hooks/useFirebase';
import { FaTrash } from 'react-icons/fa';

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

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-l-4 ${
        todo.completed ? 'border-green-400' : 'border-purple-400'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Custom checkbox */}
        <button
          onClick={handleToggle}
          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
            todo.completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 hover:border-purple-400'
          }`}
        >
          {todo.completed && <span className="text-white text-xl">✓</span>}
        </button>

        {/* Icon */}
        <div className="text-3xl">
          {getIcon(todo.iconId || 'default')}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className={`font-semibold ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {todo.title}
          </h4>
          
          {assignedMember && (
            <div className="flex items-center gap-2 mt-1">
              <UserAvatar user={assignedMember} size={20} />
              <span className="text-xs text-gray-500">
                {assignedMember.displayName}
              </span>
            </div>
          )}

          {todo.dueDate && (
            <p className="text-xs text-gray-500 mt-1">
              Due: {new Date(todo.dueDate.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Delete button for parents */}
        {isParent() && (
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 transition-colors p-2"
          >
            <FaTrash size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
