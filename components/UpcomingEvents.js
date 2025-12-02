'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import UserAvatar from './UserAvatar';
import { useTheme } from '@/contexts/ThemeContext';
import { FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { format } from 'date-fns';

export default function UpcomingEvents({ events, members, getEventDateLabel, EVENT_CATEGORIES }) {
  const { theme, currentTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`${theme.colors.bgCard} rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl`}
    >
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-2xl font-display font-bold flex items-center gap-2">
          <span className="text-xl md:text-2xl">{currentTheme === 'dark' ? '🕯️' : '📅'}</span>
          <span className="hidden sm:inline">{currentTheme === 'dark' ? 'Ominous Engagements' : 'Upcoming Events'}</span>
          <span className="sm:hidden">{currentTheme === 'dark' ? 'Omens' : 'Events'}</span>
        </h2>
        <Link
          href="/calendar"
          className="text-sm font-bold text-purple-600 hover:text-purple-800 transition-colors"
        >
          View All →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-5xl mb-3">{currentTheme === 'dark' ? '🦇' : '📆'}</p>
          <p className="font-semibold text-gray-600">
            {currentTheme === 'dark' ? 'No omens on the horizon' : 'No upcoming events'}
          </p>
          <p className="text-sm">
            {currentTheme === 'dark' ? 'The night is quiet...' : 'Your calendar is clear!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {events.map(event => {
            const category = EVENT_CATEGORIES[event.category] || EVENT_CATEGORIES.other;
            const assignedMembers = members.filter(m => event.assignedTo?.includes(m.id));
            const bgClass = currentTheme === 'dark' ? category.bgDark : category.bgLight;
            const textClass = currentTheme === 'dark' ? category.textDark : category.textLight;

            return (
              <motion.div
                key={event.id}
                whileHover={{ scale: 1.02 }}
                className={`${bgClass} p-3 md:p-4 rounded-xl md:rounded-2xl transition-all cursor-pointer`}
              >
                <div className="flex items-start gap-2 md:gap-4">
                  <div className="flex-shrink-0">
                    <div className={`${textClass} text-2xl md:text-3xl`}>
                      {category.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                      <h3 className={`font-bold ${textClass} text-sm md:text-lg`}>
                        {event.title}
                      </h3>
                      <span className={`${textClass} text-xs md:text-sm font-bold whitespace-nowrap`}>
                        {getEventDateLabel(event)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm">
                      <div className={`flex items-center gap-1 ${textClass}`}>
                        <FaClock className="text-xs md:text-sm" />
                        <span className="font-semibold">
                          {format(
                            event.start?.toDate ? event.start.toDate() : new Date(event.start),
                            'h:mm a'
                          )}
                        </span>
                      </div>

                      {event.location && (
                        <div className={`flex items-center gap-1 ${textClass}`}>
                          <FaMapMarkerAlt className="text-xs md:text-sm" />
                          <span className="font-semibold truncate">{event.location}</span>
                        </div>
                      )}

                      {assignedMembers.length > 0 && (
                        <div className="flex items-center gap-1">
                          {assignedMembers.slice(0, 3).map(member => (
                            <UserAvatar key={member.id} user={member} size={20} />
                          ))}
                          {assignedMembers.length > 3 && (
                            <span className={`${textClass} text-xs font-bold`}>
                              +{assignedMembers.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
