import { useState } from 'react';
import { FaTrash, FaRegCalendarCheck, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { getIcon } from '@/lib/icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import UserAvatar from './UserAvatar';

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function TodoItem({ todo, members = [], userId, onToggle, onUpdate, onDelete }) {
  const { currentTheme } = useTheme();
  const { showConfirmation } = useConfirmation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTodo, setEditedTodo] = useState({ ...todo });

  const priorityStyles = {
    high: currentTheme === 'dark' ? 'border-l-red-600 bg-red-900/30 text-red-200' : 'border-l-red-500 bg-red-50 text-red-700',
    medium: currentTheme === 'dark' ? 'border-l-amber-600 bg-amber-900/30 text-amber-200' : 'border-l-amber-500 bg-amber-50 text-amber-700',
    low: currentTheme === 'dark' ? 'border-l-blue-600 bg-blue-900/30 text-blue-200' : 'border-l-blue-500 bg-blue-50 text-blue-700',
  };

  const dotStyles = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  const assignedMember = members.find((m) => m.id === todo.assignedTo);
  const displayName = assignedMember?.displayName || assignedMember?.name || 'Unassigned';
  const textMain = currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800';
  const textSub = currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const defaultCardStyles = currentTheme === 'dark' ? 'border-l-gray-500 bg-gray-900/80 text-gray-200' : 'border-l-gray-300 bg-white text-gray-800';
  const priorityClass = priorityStyles[todo.priority] || defaultCardStyles;

  const getDueDate = (date) => {
    if (!date) return 'No Due Date';
    // It might be a Firestore Timestamp object or a string
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const isOverdue = todo.dueDate && (todo.dueDate.toDate ? todo.dueDate.toDate() : new Date(todo.dueDate)) < new Date();

  const handleToggle = () => {
    if (onToggle) onToggle(todo.id, todo.completed);
  };
  
  const handleUpdate = () => {
    const { title, assignedTo, priority, dueDate } = editedTodo;
    const updates = { title, assignedTo, priority, dueDate: dueDate || null };
    onUpdate(todo.id, updates);
    setIsEditing(false);
  };

  const handleDelete = () => {
    showConfirmation({
      title: 'Delete To-Do',
      message: `Are you sure you want to permanently delete "${todo.title}"?`,
      onConfirm: () => onDelete(todo.id),
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTodo({ ...todo });
  };

  // Convert Firestore timestamp to yyyy-MM-dd format for date input
  const getInputValue = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };
  
  const handleEditClick = () => {
    setEditedTodo({ ...todo });
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <motion.div className={`relative flex flex-col gap-4 p-4 mb-4 rounded-xl border-l-4 shadow-lg ${priorityStyles[editedTodo.priority] || defaultCardStyles}`}>
        {/* Title */}
        <input
          type="text"
          value={editedTodo.title}
          onChange={(e) => setEditedTodo({ ...editedTodo, title: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg border-2 font-semibold bg-transparent ${currentTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'} focus:border-purple-500`}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Assignee */}
          <select
            value={editedTodo.assignedTo}
            onChange={(e) => setEditedTodo({ ...editedTodo, assignedTo: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border-2 font-semibold bg-transparent ${currentTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'} focus:border-purple-500`}
          >
            {members.map(member => <option key={member.id} value={member.id}>{member.displayName}</option>)}
          </select>
          {/* Priority */}
          <select
            value={editedTodo.priority}
            onChange={(e) => setEditedTodo({ ...editedTodo, priority: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg border-2 font-semibold bg-transparent ${currentTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'} focus:border-purple-500`}
          >
            {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {/* Due Date */}
          <input
            type="date"
            value={getInputValue(editedTodo.dueDate)}
            onChange={(e) => setEditedTodo({ ...editedTodo, dueDate: e.target.value ? new Date(e.target.value.replace(/-/g, '/')) : null })}
            className={`w-full px-3 py-2 rounded-lg border-2 font-semibold bg-transparent ${currentTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'} focus:border-purple-500`}
          />
        </div>
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <button onClick={handleCancel} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${currentTheme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}><FaTimes /> Cancel</button>
          <button onClick={handleUpdate} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white bg-green-500 hover:bg-green-600 transition-colors"><FaSave /> Save</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative flex flex-col gap-2 p-4 mb-4 rounded-xl border-l-4 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${priorityClass} ${isOverdue ? 'border-red-500 dark:border-red-400' : ''}`}
      whileHover={{ y: -2 }}
    >
      {/* First Row: Checkbox, Icon, Title */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Checkbox + Icon */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <input
            type="checkbox"
            checked={!!todo.completed}
            onChange={handleToggle}
            className="h-5 w-5 accent-purple-500 rounded cursor-pointer bg-transparent"
          />
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl">
            {todo.iconId ? getIcon(todo.iconId) : '??'}
          </div>
        </div>
        {/* Right: Title (can now flow freely) */}
        <h3 className={`flex-grow font-bold text-lg ${todo.completed ? 'line-through' : ''}`}>{todo.title}</h3>
      </div>

      {/* Second Row: Priority, Due Date */}
      <div className="flex items-center justify-between w-full text-sm">
        {/* Left: Priority */}
        <p className={`flex-grow ${isOverdue ? 'text-red-500 dark:text-red-400' : textSub}`}>
          {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority
        </p>
        {/* Right: Due Date */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <FaRegCalendarCheck className="text-purple-500 dark:text-purple-400" size={14} />
          <span className={`${isOverdue ? 'text-red-500 font-bold' : textSub}`}>Due {getDueDate(todo.dueDate)}</span>
        </div>
      </div>

      {/* Third Row: Avatar + Name, Edit + Delete Buttons */}
      {(assignedMember || (userId === todo.assignedBy || userId === todo.assignedTo)) && ( /* Only show if assigned or has actions */
        <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-gray-100 dark:border-gray-500">
          {/* Assigned Member */}
          <div className="flex items-center gap-2 flex-grow">
            <UserAvatar user={assignedMember} size={28} />
            <p className={`font-semibold ${textMain}`}>{displayName}</p>
          </div>

          {/* Edit and Delete Buttons */}
          {(userId === todo.assignedBy || userId === todo.assignedTo) && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleEditClick} className={`p-2 rounded-full transition-colors ${currentTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} aria-label="Edit todo"><FaEdit /></button>
              <button onClick={handleDelete} className={`p-2 rounded-full transition-colors ${currentTheme === 'dark' ? 'text-gray-400 hover:text-red-500 hover:bg-gray-700' : 'text-gray-500 hover:text-red-600 hover:bg-gray-200'}`} aria-label="Delete todo"><FaTrash /></button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default TodoItem;