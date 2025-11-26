import { FaTrash, FaRegCalendarCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { getIcon } from '@/lib/icons';
import { useTheme } from '@/contexts/ThemeContext';

function TodoItem({ todo, members = [], userId, onToggle }) {
  const { currentTheme } = useTheme();

  // Priority styles (matching your PRIORITY_OPTIONS)
  const priorityStyles = {
    high: currentTheme === 'dark' ? 'border-l-red-600 bg-red-900/30 text-red-200' : 'border-l-red-500 bg-red-50 text-red-700',
    medium: currentTheme === 'dark' ? 'border-l-amber-600 bg-amber-900/30 text-amber-200' : 'border-l-amber-500 bg-amber-50 text-amber-700',
    low: currentTheme === 'dark' ? 'border-l-blue-600 bg-blue-900/30 text-blue-200' : 'border-l-blue-500 bg-blue-50 text-blue-700',
  };

  // Dot styles for priority
  const dotStyles = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  // Assigned member handling
  const assignedMember = members.find((m) => m.id === todo.assignedTo) || { displayName: 'Unassigned', avatar: '' };
  const avatarUrl = assignedMember?.avatar?.url || assignedMember?.avatar || assignedMember?.photoURL || '/default-avatar.png';
  const displayName = assignedMember?.displayName || assignedMember?.name || 'Unassigned';
  const extraIconList = todo.extraIcons ? Array.from(todo.extraIcons) : [];
  const textMain = currentTheme === 'dark' ? 'text-gray-100' : 'text-gray-800';
  const textSub = currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const defaultCardStyles = currentTheme === 'dark' ? 'border-l-gray-500 bg-gray-900/80 text-gray-200' : 'border-l-gray-300 bg-white text-gray-800';
  const priorityClass = priorityStyles[todo.priority] || defaultCardStyles;

  // Due date formatting (using your current date: Nov 25, 2025)
  const dueDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Due Date';
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date(); // Simple overdue check

  const handleToggle = () => {
    if (onToggle) onToggle(todo.id, todo.completed);
  };

  return (
    <motion.div
      className={`
        relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 mb-4
        rounded-xl border-l-4 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]
        ${priorityClass}
        ${isOverdue ? 'border-red-500 dark:border-red-400' : ''}
      `}
      whileHover={{ y: -2 }}
    >
      {/* Left: checkbox + icon + fun icons */}
      <div className="flex items-center gap-3 min-w-[170px]">
        <input
          type="checkbox"
          checked={!!todo.completed}
          onChange={handleToggle}
          className="h-5 w-5 accent-purple-500 rounded cursor-pointer bg-transparent"
          aria-label={`Mark ${todo.title} as ${todo.completed ? 'active' : 'completed'}`}
        />
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl">
          {todo.iconId ? getIcon(todo.iconId) : '??'}
        </div>
        {extraIconList.length > 0 && (
          <div className="inline-flex flex-wrap items-center gap-1 text-2xl leading-none">
            {extraIconList.map((icon, idx) => (
              <span key={`${icon}-${idx}`} className="leading-none">
                {icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Middle: Title + Priority Dot */}
      <div className="flex-1 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${dotStyles[todo.priority] || 'bg-gray-400'}`} />
        <div className="flex flex-col">
          <h3 className="font-bold text-lg">{todo.title}</h3>
          <p className={`text-sm ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
          </p>
        </div>
      </div>

      {/* Right: Due + Assignee stacked (stack on mobile) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-start gap-3 sm:gap-6 text-sm w-full sm:w-auto text-left">
        <div className="flex items-center gap-2">
          <FaRegCalendarCheck className="text-purple-500 dark:text-purple-400" size={14} />
          <span className={`${isOverdue ? 'text-red-500 dark:text-red-400' : textSub}`}>Due {dueDate}</span>
        </div>
        <div className="flex items-center gap-2">
          {avatarUrl && avatarUrl !== '/default-avatar.png' ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {displayName?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="leading-tight">
            <p className={`font-semibold ${textMain}`}>{displayName}</p>
            <p className={`text-xs ${textSub}`}>Assignee</p>
          </div>
        </div>
        {userId === todo.createdBy && (
          <button className="sm:ml-auto text-gray-400 hover:text-red-500 dark:hover:text-red-400" aria-label="Delete todo">
            <FaTrash size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default TodoItem;
