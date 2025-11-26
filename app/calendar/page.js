'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CalendarShare from '@/components/CalendarShare';
import { useCalendarEvents } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { 
  FaPlus, FaTrash, FaClock, FaMapMarkerAlt, FaUser, FaTimes, 
  FaFilter, FaChevronLeft, FaChevronRight, FaCalendarAlt,
  FaBirthdayCake, FaRunning, FaSchool, FaBell, FaUsers, FaAsterisk
} from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/UserAvatar';

const EVENT_CATEGORIES = [
  { value: 'appointment', label: 'Appointment', emoji: '🏥', Icon: FaCalendarAlt, lightBg: 'bg-blue-100 text-blue-800', darkBg: 'bg-blue-900/60 text-blue-100', gradient: 'from-blue-400 to-blue-600' },
  { value: 'birthday', label: 'Birthday', emoji: '🎂', Icon: FaBirthdayCake, lightBg: 'bg-pink-100 text-pink-800', darkBg: 'bg-pink-900/60 text-pink-100', gradient: 'from-pink-400 to-pink-600' },
  { value: 'activity', label: 'Activity', emoji: '⚽', Icon: FaRunning, lightBg: 'bg-green-100 text-green-800', darkBg: 'bg-emerald-900/60 text-emerald-100', gradient: 'from-green-400 to-emerald-600' },
  { value: 'school', label: 'School', emoji: '📚', Icon: FaSchool, lightBg: 'bg-yellow-100 text-yellow-800', darkBg: 'bg-amber-900/60 text-amber-100', gradient: 'from-yellow-400 to-amber-600' },
  { value: 'reminder', label: 'Reminder', emoji: '⏰', Icon: FaBell, lightBg: 'bg-purple-100 text-purple-800', darkBg: 'bg-violet-900/60 text-purple-100', gradient: 'from-purple-400 to-violet-600' },
  { value: 'social', label: 'Social', emoji: '🎉', Icon: FaUsers, lightBg: 'bg-orange-100 text-orange-800', darkBg: 'bg-orange-900/60 text-orange-100', gradient: 'from-orange-400 to-orange-600' },
  { value: 'other', label: 'Other', emoji: '⭐', Icon: FaAsterisk, lightBg: 'bg-gray-200 text-gray-800', darkBg: 'bg-gray-800 text-gray-100', gradient: 'from-gray-400 to-gray-600' },
];

const REMINDER_OPTIONS = [
  { value: 15, label: '15 min before', icon: '⏰' },
  { value: 30, label: '30 min before', icon: '⏰' },
  { value: 60, label: '1 hour before', icon: '⏰' },
  { value: 120, label: '2 hours before', icon: '⏰' },
  { value: 1440, label: '1 day before', icon: '📅' },
  { value: 2880, label: '2 days before', icon: '📅' },
  { value: 10080, label: '1 week before', icon: '📅' },
];

function CalendarContent() {
  const { events, loading } = useCalendarEvents();
  const { userData } = useAuth();
  const { members, isParent } = useFamily();
  const { theme, currentTheme } = useTheme(); 
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false); 
  const [viewMode, setViewMode] = useState('list'); 
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', start: '', end: '', 
    category: 'other', location: '', assignedTo: [], 
    allDay: false, recurring: 'none',
    reminders: []  // ADD THIS
  });
  
  const [syncing, setSyncing] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState(null);
  const [settingUpGoogle, setSettingUpGoogle] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');

  const isDarkMode = currentTheme === 'dark';
  const pillBase = 'px-4 py-2 rounded-full border-2 font-bold transition-all flex items-center gap-2 whitespace-nowrap';
  const pillActive = 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-purple-300 shadow-lg';
  const pillInactive = isDarkMode
    ? 'bg-gray-800 text-gray-200 border-gray-700 hover:border-purple-400'
    : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-purple-300';
  useEffect(() => {
    const checkGoogleCalendar = async () => {
      if (!userData?.familyId) return;
      try {
        const familyDoc = await getDoc(doc(db, 'families', userData.familyId));
        const familyData = familyDoc.data();
        if (familyData?.googleCalendarId) {
          setGoogleCalendarId(familyData.googleCalendarId);
          // share link available via googleCalendarId if needed
        }
      } catch (error) {
        console.error('Error checking Google Calendar:', error);
      }
    };
    checkGoogleCalendar();
  }, [userData?.familyId]);

  const handleSetupGoogleCalendar = async () => {
    if (!userData?.familyId) return;
    setSettingUpGoogle(true);
    try {
      const setupCalendar = httpsCallable(functions, 'setupGoogleCalendar');
      const result = await setupCalendar({ familyId: userData.familyId });
      if (result.data.calendarId) {
        await updateDoc(doc(db, 'families', userData.familyId), { googleCalendarId: result.data.calendarId });
        setGoogleCalendarId(result.data.calendarId);
        toast.success('Google Calendar created! 🎉');
      }
    } catch (error) {
      console.error('Error setting up Google Calendar:', error);
      toast.error('Failed to setup Google Calendar. Please try again.');
    } finally {
      setSettingUpGoogle(false);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!userData?.familyId) return;
    try {
      setSyncing(true);
      const eventRef = await addDoc(collection(db, 'families', userData.familyId, 'calendar-events'), {
        title: newEvent.title, description: newEvent.description, start: new Date(newEvent.start), end: new Date(newEvent.end),
        category: newEvent.category, location: newEvent.location, assignedTo: newEvent.assignedTo, allDay: newEvent.allDay,
        recurring: newEvent.recurring, reminders: newEvent.reminders || [], createdBy: userData.uid, createdAt: serverTimestamp(),
      });
      try {
        const syncEvent = httpsCallable(functions, 'syncEventToGoogleCalendar');
        syncEvent({
          familyId: userData.familyId, eventId: eventRef.id,
          eventData: { title: newEvent.title, description: newEvent.description, start: new Date(newEvent.start).toISOString(), end: new Date(newEvent.end).toISOString() },
        });
      } catch (e) { console.warn('Sync warning', e); }

      toast.success('Event added!');
      setShowAddModal(false);
      setNewEvent({ title: '', description: '', start: '', end: '', category: 'other', location: '', assignedTo: [], allDay: false, recurring: 'none', reminders: [] });
    } catch (error) {
      console.error('Failed to add event', error);
      toast.error('Failed to add event');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!userData?.familyId || !confirm(`Delete "${event.title}"?`)) return;
    try {
      if (event.googleEventId) {
        const deleteGoogleEvent = httpsCallable(functions, 'deleteEventFromGoogleCalendar');
        deleteGoogleEvent({ familyId: userData.familyId, googleEventId: event.googleEventId });
      }
      await deleteDoc(doc(db, 'families', userData.familyId, 'calendar-events', event.id));
      toast.success('Event deleted!');
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event', error);
      toast.error('Failed to delete event');
    }
  };

  const toggleMemberAssignment = (memberId) => {
    const current = newEvent.assignedTo || [];
    setNewEvent({ ...newEvent, assignedTo: current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId] });
  };

  const toggleReminder = (minutes) => {
  const current = newEvent.reminders || [];
  setNewEvent({ 
    ...newEvent, 
    reminders: current.includes(minutes) 
      ? current.filter(m => m !== minutes) 
      : [...current, minutes] 
  });
};

  const filteredEvents = (events || []).filter(event => {
    if (!event) return false;
    if (filterCategory !== 'all' && event.category !== filterCategory) return false;
    if (filterMember !== 'all' && !event.assignedTo?.includes(filterMember)) return false;
    return true;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });

  const getEventsForDay = (day) => {
    return filteredEvents.filter(event => {
      const eventDate = event.start?.toDate ? event.start.toDate() : new Date(event.start);
      return isSameDay(eventDate, day);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{
              rotate: { repeat: Infinity, duration: 2, ease: "linear" },
              scale: { repeat: Infinity, duration: 1.5 }
            }}
            className="text-7xl mb-4"
          >
            📅
          </motion.div>
          <p className={`text-xl font-bold ${currentTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
            Loading calendar...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold">
              <span className={currentTheme === 'dark' ? 'text-purple-400' : 'gradient-text'}>
                {currentTheme === 'dark' ? 'Ominous Engagements' : 'Family Calendar'}
              </span>
            </h1>
            <p className={`text-base ${theme.colors.textMuted}`}>
              {format(currentMonth, 'MMMM yyyy')} • {filteredEvents.length} events
            </p>
          </div>

          {isParent() && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              aria-label="Add Event"
            >
              <FaPlus size={16} />
              <span className="hidden sm:inline">Add Event</span>
            </motion.button>
          )}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className={`flex rounded-2xl p-1.5 shadow-sm ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              {['month', 'week', 'list'].map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <motion.button
                    key={mode}
                    whileHover={!isActive ? { scale: 1.05 } : {}}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold capitalize transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {mode}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all shadow-sm border ${
                showFilters
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400 text-white shadow-md'
                  : isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FaFilter /> Filters
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 pt-2">
                  <div>
                    <label className={`text-xs font-bold mb-2 block ml-1 ${theme.colors.textMuted}`}>Category</label>
                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                      <div className="flex gap-3 shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFilterCategory('all')}
                          className={`${pillBase} ${filterCategory === 'all' ? pillActive : pillInactive}`}
                        >
                          <FaFilter size={14} />
                          <span>All</span>
                        </motion.button>
                        {EVENT_CATEGORIES.map(cat => (
                          <motion.button
                            key={cat.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFilterCategory(cat.value)}
                            className={`${pillBase} ${filterCategory === cat.value ? pillActive : pillInactive}`}
                          >
                            <span className="text-lg">{cat.emoji}</span>
                            <span>{cat.label}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-xs font-bold mb-2 block ml-1 ${theme.colors.textMuted}`}>Member</label>
                    <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
                      <div className="flex gap-3 shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFilterMember('all')}
                          className={`${pillBase} ${filterMember === 'all' ? pillActive : pillInactive}`}
                        >
                          <FaUser size={14} />
                          <span>All</span>
                        </motion.button>
                        {members.map(m => (
                          <motion.button
                            key={m.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setFilterMember(m.id)}
                            className={`${pillBase} ${filterMember === m.id ? pillActive : pillInactive}`}
                          >
                            <UserAvatar user={m} size={24} />
                            <span>{m.displayName}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {(viewMode === 'month' || viewMode === 'week') && (
          <div className={`${theme.colors.bgCard} rounded-2xl p-3 md:p-4 shadow-sm mb-4 flex items-center justify-between border ${theme.colors.border}`}>
            <motion.button
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className={`p-2.5 rounded-xl hover:bg-gray-100 transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'text-gray-700'}`}
            >
              <FaChevronLeft size={18} />
            </motion.button>
            <h2 className={`text-lg md:text-xl font-bold ${theme.colors.text}`}>
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <motion.button
              whileHover={{ scale: 1.1, x: 2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className={`p-2.5 rounded-xl hover:bg-gray-100 transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'text-gray-700'}`}
            >
              <FaChevronRight size={18} />
            </motion.button>
          </div>
        )}
      </div>
      {viewMode === 'month' && (
        <div className={`${theme.colors.bgCard} rounded-2xl p-2 md:p-6 shadow-lg border ${theme.colors.border}`}>
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className={`text-center font-bold text-sm md:text-base py-2 ${theme.colors.text}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              let bgClass = isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50';
              let borderClass = isDarkMode ? 'border-gray-700' : 'border-gray-100';
              let textClass = isDarkMode ? 'text-gray-400' : 'text-gray-400';

              if (isCurrentDay) {
                bgClass = 'bg-purple-50 dark:bg-purple-900/20';
                borderClass = 'border-purple-500';
                textClass = 'text-purple-600 dark:text-purple-400';
              } else if (isCurrentMonth) {
                bgClass = isDarkMode ? 'bg-gray-800' : 'bg-white';
                borderClass = isDarkMode ? 'border-gray-700' : 'border-gray-200';
                textClass = theme.colors.text;
              }

              return (
                <div
                  key={idx}
                  className={`min-h-[85px] md:min-h-[120px] p-1 md:p-2 rounded-lg border transition-all flex flex-col ${bgClass} ${borderClass}`}
                >
                  <div className={`text-xs md:text-sm font-bold mb-1 text-center md:text-left ${textClass}`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayEvents.map(event => {
                      const category = EVENT_CATEGORIES.find(c => c.value === event.category);
                      const badgeBg = isDarkMode ? category?.darkBg : category?.lightBg;
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className="cursor-pointer group"
                        >
                          <div className={`md:hidden flex items-center gap-1 p-1 rounded-md mb-1 ${badgeBg}`}>
                            <span className="text-[10px]">{category?.emoji}</span>
                            <span className="text-[9px] font-bold truncate leading-tight">{event.title}</span>
                          </div>
                          <div className={`hidden md:flex items-center gap-1 text-xs px-1.5 py-0.5 rounded truncate ${badgeBg}`}>
                            <span className="text-sm">{category?.emoji}</span>
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {viewMode === 'week' && (
        <div className={`${theme.colors.bgCard} rounded-2xl p-4 shadow-lg border ${theme.colors.border}`}>
          <div className="space-y-4">
            {eachDayOfInterval({ start: startOfWeek(currentMonth), end: endOfWeek(currentMonth) }).map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div key={idx} className={`flex flex-col md:flex-row gap-4 p-3 rounded-xl ${isCurrentDay ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                  <div className="flex items-center gap-3 md:w-32">
                     <div className={`text-center min-w-[50px] ${isCurrentDay ? 'text-purple-600 dark:text-purple-400' : theme.colors.text}`}>
                        <div className="text-xs font-bold uppercase">{format(day, 'EEE')}</div>
                        <div className="text-2xl font-bold">{format(day, 'd')}</div>
                     </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {dayEvents.length === 0 && <span className="text-xs text-gray-400 italic">No events</span>}
                    {dayEvents.map(event => {
                      const category = EVENT_CATEGORIES.find(c => c.value === event.category);
                      const badgeBg = isDarkMode ? category?.darkBg : category?.lightBg;
                      return (
                         <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${badgeBg}`}
                         >
                           <span className="text-lg">{category?.emoji}</span>
                           <span className="font-bold text-sm flex-1">{event.title}</span>
                           <span className="text-xs opacity-75">{format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'h:mm a')}</span>
                         </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center py-16 rounded-3xl border-2 border-dashed ${
                currentTheme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-7xl mb-4"
              >
                📅
              </motion.div>
              <p className={`text-xl font-bold mb-2 ${theme.colors.text}`}>
                No events scheduled!
              </p>
              <p className={`${theme.colors.textMuted} mb-6`}>
                Add your first event to get started
              </p>
              {isParent() && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Add First Event
                </motion.button>
              )}
            </motion.div>
          ) : (
            filteredEvents.map(event => {
              const category = EVENT_CATEGORIES.find(c => c.value === event.category) || FALLBACK_CATEGORY;
              const badgeBg = isDarkMode ? category.darkBg : category.lightBg;
              const gradient = category.gradient || 'from-gray-400 to-gray-600';
              
              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                  onClick={() => setSelectedEvent(event)}
                  className={`${theme.colors.bgCard} p-4 md:p-5 rounded-2xl shadow-md hover:shadow-xl transition-all border ${theme.colors.border} cursor-pointer flex items-center gap-4`}
                >
                   <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl flex-shrink-0 shadow-lg`}>
                      {category?.emoji}
                   </div>
                   <div className="flex-1">
                      <h3 className={`font-bold text-lg ${theme.colors.text}`}>{event.title}</h3>
                      <p className={`text-sm ${theme.colors.textMuted}`}>{format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'PPP p')}</p>
                   </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      <div className="mt-8 mb-4">
        {!googleCalendarId && isParent() ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${theme.colors.bgCard} border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 text-center`}>
            <div className="mb-2 text-3xl">🔗</div>
            <h3 className={`font-bold ${theme.colors.text} mb-1`}>Sync Family Calendar</h3>
            <p className={`text-sm ${theme.colors.textMuted} mb-4`}>Connect Google Calendar to see events on all devices.</p>
            <button onClick={handleSetupGoogleCalendar} disabled={settingUpGoogle} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-700">
               {settingUpGoogle ? 'Connecting...' : 'Connect Google Calendar'}
            </button>
          </motion.div>
        ) : googleCalendarId ? (
          <div className={`${theme.colors.bgCard} rounded-2xl shadow-sm border ${theme.colors.border} overflow-hidden`}>
             <CalendarShare id={googleCalendarId} isDarkMode={isDarkMode} />
          </div>
        ) : null}
      </div>
      <AnimatePresence>
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
             <motion.div 
               initial={{ scale: 0.95, y: 10 }} 
               animate={{ scale: 1, y: 0 }} 
               exit={{ scale: 0.95, y: 10 }} 
               onClick={(e) => e.stopPropagation()} 
               className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-sm w-full shadow-2xl overflow-hidden border ${theme.colors.border}`}
             >
                {(() => {
                   const category = EVENT_CATEGORIES.find(c => c.value === selectedEvent.category);
                   const gradient = category?.gradient || 'from-gray-400 to-gray-600';
                   const assigned = members.filter(m => selectedEvent.assignedTo?.includes(m.id));
                   return (
                      <>
                        <div className={`-mt-6 -mx-6 p-6 bg-gradient-to-br ${gradient} mb-4 flex items-start justify-between text-white`}>
                           <div>
                              <div className="text-5xl mb-3">{category?.emoji}</div>
                              <h3 className="text-2xl font-bold leading-tight">{selectedEvent.title}</h3>
                              <p className="text-sm font-semibold opacity-90">{category?.label}</p>
                           </div>
                           <button onClick={() => setSelectedEvent(null)} className="bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-colors backdrop-blur-sm">
                              <FaTimes size={16} className="text-white" />
                           </button>
                        </div>
                        
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg"><FaClock className="text-gray-500 dark:text-gray-400"/></div>
                              <div>
                                 <p className={`text-sm font-bold ${theme.colors.text}`}>
                                    {format(selectedEvent.start?.toDate ? selectedEvent.start.toDate() : new Date(selectedEvent.start), 'PPP')}
                                 </p>
                                 <p className={`text-xs ${theme.colors.textMuted}`}>
                                    {format(selectedEvent.start?.toDate ? selectedEvent.start.toDate() : new Date(selectedEvent.start), 'h:mm a')}
                                    {selectedEvent.end && ` - ${format(selectedEvent.end?.toDate ? selectedEvent.end.toDate() : new Date(selectedEvent.end), 'h:mm a')}`}
                                 </p>
                              </div>
                           </div>
                           
                           {selectedEvent.location && (
                              <div className="flex items-center gap-3">
                                 <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg"><FaMapMarkerAlt className="text-red-500"/></div>
                                 <p className={`text-sm font-medium ${theme.colors.text}`}>{selectedEvent.location}</p>
                              </div>
                           )}

                           {assigned.length > 0 && (
                              <div className="flex items-center gap-3">
                                 <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg"><FaUser className="text-purple-500"/></div>
                                 <div className="flex flex-wrap gap-1">
                                    {assigned.map(m => <UserAvatar key={m.id} user={m} size={24} />)}
                                 </div>
                              </div>
                           )}
                          
                           {selectedEvent.description && (
                              <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm ${theme.colors.textMuted} italic`}>
                                 &quot;{selectedEvent.description}&quot;
                              </div>
                           )}
                        </div>

                        {isParent() && (
                           <button 
                              onClick={() => handleDeleteEvent(selectedEvent)} 
                              className="mt-6 w-full flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors"
                           >
                              <FaTrash size={14}/> Delete Event
                           </button>
                        )}
                      </>
                   );
                })()}
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border ${theme.colors.border}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold gradient-text">Add Event</h2>
                <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-xl transition-colors ${currentTheme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}><FaTimes size={20}/></button>
              </div>
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Title</label>
                  <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className={`w-full p-3 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text}`} placeholder="Event Title" required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Start</label>
                      <input type="datetime-local" value={newEvent.start} onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })} className={`w-full p-2 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text} text-xs`} required />
                   </div>
                   <div>
                      <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>End</label>
                      <input type="datetime-local" value={newEvent.end} onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })} className={`w-full p-2 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text} text-xs`} required />
                   </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={newEvent.allDay}
                    onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="allDay" className={`font-semibold text-sm ${theme.colors.text}`}>
                    All-day event
                  </label>
                </div>

                <div>
                   <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Category</label>
                   <div className="grid grid-cols-2 gap-2">
                      {EVENT_CATEGORIES.map(cat => (
                         <motion.button
                            type="button"
                            key={cat.value}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setNewEvent({...newEvent, category: cat.value})}
                            className={`p-3 rounded-xl border-2 whitespace-nowrap text-sm flex items-center gap-2 font-bold transition-all ${
                               newEvent.category === cat.value
                                  ? `bg-gradient-to-r ${cat.gradient} text-white border-transparent shadow-md`
                                  : currentTheme === 'dark'
                                     ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                                     : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            }`}
                         >
                            <span className="text-2xl">{cat.emoji}</span>
                            <span>{cat.label}</span>
                         </motion.button>
                      ))}
                   </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Location (optional)</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Soccer field, Doctor's office, etc."
                    className={`w-full p-3 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Assign To (optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMemberAssignment(member.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs ${
                          newEvent.assignedTo?.includes(member.id)
                            ? 'bg-purple-100 border-purple-500 text-purple-700'
                            : `${theme.colors.border} ${theme.colors.textMuted}`
                        }`}
                      >
                        <UserAvatar user={member} size={20} />
                        <span className="font-semibold">{member.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Repeat</label>
                  <select
                    value={newEvent.recurring}
                    onChange={(e) => setNewEvent({ ...newEvent, recurring: e.target.value })}
                    className={`w-full p-3 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text}`}
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-2 flex items-center gap-2`}>
                    <FaBell /> Reminders (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {REMINDER_OPTIONS.map(reminder => (
                      <motion.button
                        key={reminder.value}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleReminder(reminder.value)}
                        className={`p-2.5 rounded-xl border-2 text-xs flex items-center gap-2 font-semibold transition-all ${
                          newEvent.reminders?.includes(reminder.value)
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-md'
                            : currentTheme === 'dark'
                              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-base">{reminder.icon}</span>
                        <span className="leading-tight">{reminder.label}</span>
                      </motion.button>
                    ))}
                  </div>
                  {newEvent.reminders?.length > 0 && (
                    <p className={`text-xs ${theme.colors.textMuted} mt-2 italic flex items-center gap-1`}>
                      <FaBell size={10} />
                      {newEvent.reminders.length} reminder{newEvent.reminders.length !== 1 ? 's' : ''} set
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Description (optional)</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Additional details..."
                    className={`w-full p-3 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text}`}
                    rows={3}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={syncing}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 md:py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all mt-2"
                >
                   {syncing ? 'Adding...' : 'Save Event'}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function CalendarPage() {
  return (
    <DashboardLayout>
      <CalendarContent />
    </DashboardLayout>
  );
}
