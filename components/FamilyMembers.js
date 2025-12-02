'use client';

import { motion } from 'framer-motion';
import UserAvatar from './UserAvatar';
import { useTheme } from '@/contexts/ThemeContext';

export default function FamilyMembers({ members, allMedications, getScheduleStatus, setSelectedMember }) {
  const { theme, currentTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl`}
    >
      <h2 className="text-lg md:text-2xl font-display font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="text-xl md:text-2xl">{currentTheme === 'dark' ? '🕯️' : '👪'}</span>
        {currentTheme === 'dark' ? 'Coven Members' : 'Family Members'}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 md:gap-4">
        {members.map((member) => (
          <motion.div
            key={member.id}
            whileHover={{ scale: 1.05 }}
            onClick={() => setSelectedMember(member)}
            className={`text-center p-3 md:p-4 ${currentTheme === 'dark' ? 'bg-gradient-to-br from-purple-900/40 to-gray-900 border-2 border-purple-900/50' : 'bg-gradient-to-br from-purple-50 to-pink-50'} rounded-xl md:rounded-2xl cursor-pointer hover:shadow-lg transition-all`}
          >
            <div className="flex justify-center mb-1 md:mb-2 relative">
              <UserAvatar user={member} size={48} />
              {allMedications.filter(med => med.assignedTo === member.id && med.times.some(time => getScheduleStatus(time, med.takenLogs, med.assignedTo).status === 'missed')).length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {allMedications.filter(med => med.assignedTo === member.id && med.times.some(time => getScheduleStatus(time, med.takenLogs, med.assignedTo).status === 'missed')).length}
                </div>
              )}
            </div>
            <p className={`font-bold ${theme.colors.text} text-xs md:text-sm truncate`}>
              {member.displayName}
            </p>
            <p className={`text-[10px] md:text-xs ${theme.colors.textMuted}`}>
              {member.role === 'parent'
                ? (currentTheme === 'dark' ? '🧛 Parent' : '👑 Parent')
                : (currentTheme === 'dark' ? '🧟 Kid' : '🎮 Kid')}
            </p>
            {member.role !== 'parent' && (
              <p className="text-[10px] md:text-xs font-bold text-yellow-600 mt-0.5 md:mt-1">
                {currentTheme === 'dark' ? '🩸' : '⭐'} {member.points || 0}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
