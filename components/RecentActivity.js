'use client';

import { motion } from 'framer-motion';
import UserAvatar from './UserAvatar';
import { useTheme } from '@/contexts/ThemeContext';

export default function RecentActivity({ todos, chores, members }) {
  const { theme, currentTheme } = useTheme();

  const activityItems = [
    ...todos
      .filter(t => t.completed && t.completedAt)
      .map(t => ({ ...t, type: 'todo', completedAt: t.completedAt })),
    ...chores
      .filter(c => c.status === 'approved' && c.approvedAt)
      .map(c => ({ ...c, type: 'chore', completedAt: c.approvedAt })),
  ].sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis());

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl`}
    >
      <h2 className="text-lg md:text-2xl font-display font-bold mb-3 md:mb-4 flex items-center gap-2">
        <span className="text-xl md:text-2xl">{currentTheme === 'dark' ? '🦴' : '✨'}</span>
        <span className="hidden sm:inline">{currentTheme === 'dark' ? 'Recent Rituals' : 'Recent Activity'}</span>
        <span className="sm:hidden">{currentTheme === 'dark' ? 'Rituals' : 'Activity'}</span>
      </h2>

      <div className="space-y-2 md:space-y-3">
        {activityItems.slice(0, 4).map((item) => {
          const member = members.find(m => m.id === item.assignedTo);
          if (item.type === 'todo') {
            return (
              <div key={`todo-${item.id}`} className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl ${currentTheme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <div className="text-xl md:text-2xl">✅</div>
                {member && <UserAvatar user={member} size={28} />}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${theme.colors.text} text-xs md:text-sm truncate`}>
                    {member?.displayName} completed
                  </p>
                  <p className={`text-xs ${theme.colors.textMuted} truncate`}>{item.title}</p>
                </div>
              </div>
            );
          }
          if (item.type === 'chore') {
            return (
              <div key={`chore-${item.id}`} className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl ${currentTheme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                <div className="text-xl md:text-2xl">🏆</div>
                {member && <UserAvatar user={member} size={28} />}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${theme.colors.text} text-xs md:text-sm truncate`}>
                    {member?.displayName} +{item.pointValue}pts
                  </p>
                  <p className={`text-xs ${theme.colors.textMuted} truncate`}>{item.title}</p>
                </div>
              </div>
            );
          }
          return null;
        })}

        {activityItems.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">{currentTheme === 'dark' ? '🕸️' : '😴'}</p>
            <p className="font-semibold">{currentTheme === 'dark' ? 'No fresh incantations' : 'No recent activity'}</p>
            <p className="text-sm">{currentTheme === 'dark' ? 'Finish a task to rouse the spirits' : 'Complete tasks to see them here'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
