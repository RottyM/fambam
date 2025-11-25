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
  FaCalendarAlt, FaList, FaCalendarWeek, FaGoogle, FaLink, 
  FaCheckCircle, FaFilter, FaChevronLeft, FaChevronRight 
} from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import UserAvatar from '@/components/UserAvatar';

const EVENT_CATEGORIES = [
  { value: 'appointment', label: 'Appointment', icon: '🏥', color: 'from-blue-400 to-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  { value: 'birthday', label: 'Birthday', icon: '🎂', color: 'from-pink-400 to-pink-500', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
  { value: 'activity', label: 'Activity', icon: '⚽', color: 'from-green-400 to-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  { value: 'school', label: 'School', icon: '📚', color: 'from-yellow-400 to-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  { value: 'reminder', label: 'Reminder', icon: '⏰', color: 'from-purple-400 to-purple-500', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  { value: 'social', label: 'Social', icon: '🎉', color: 'from-orange-400 to-orange-500', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  { value: 'other', label: 'Other', icon: '📌', color: 'from-gray-400 to-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
];

function CalendarContent() {
  const { events, loading } = useCalendarEvents();
  const { userData } = useAuth();
  const { members, isParent } = useFamily();
  const { theme, currentTheme } = useTheme(); 
  
  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false); 
  const [viewMode, setViewMode] = useState('list'); 
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Data States
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', start: '', end: '', category: 'other', location: '', assignedTo: [], allDay: false, recurring: 'none',
  });
  
  // Google Calendar States
  const [syncing, setSyncing] = useState(false);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState(null);
  const [settingUpGoogle, setSettingUpGoogle] = useState(false);
  const [calendarShareLink, setCalendarShareLink] = useState('');

  const isDarkMode = currentTheme === 'dark';

  // --- Effects & Handlers ---

  useEffect(() => {
    const checkGoogleCalendar = async () => {
      if (!userData?.familyId) return;
      try {
        const familyDoc = await getDoc(doc(db, 'families', userData.familyId));
        const familyData = familyDoc.data();
        if (familyData?.googleCalendarId) {
          setGoogleCalendarId(familyData.googleCalendarId);
          setCalendarShareLink(`https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(familyData.googleCalendarId)}`);
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
        setCalendarShareLink(`https://calendar.google.com/calendar/u/0?cid=${encodeURIComponent(result.data.calendarId)}`);
        setShowGoogleSetup(true);
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
        recurring: newEvent.recurring, createdBy: userData.uid, createdAt: serverTimestamp(),
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
      setNewEvent({ title: '', description: '', start: '', end: '', category: 'other', location: '', assignedTo: [], allDay: false, recurring: 'none' });
    } catch (error) {
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
      toast.error('Failed to delete event');
    }
  };

  const toggleMemberAssignment = (memberId) => {
    const current = newEvent.assignedTo || [];
    setNewEvent({ ...newEvent, assignedTo: current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId] });
  };

  // --- Filtering & Date Logic ---
  const filteredEvents = events.filter(event => {
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading calendar...</div>;

  return (
    <>
      {/* --- HEADER SECTION --- */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              <span className="gradient-text">Family Calendar</span>
            </h1>
            <p className={`text-base ${theme.colors.textMuted}`}>
              {format(currentMonth, 'MMMM yyyy')} • {filteredEvents.length} events
            </p>
          </div>

          {/* ADD BUTTON (Squircle) */}
          {isParent() && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white w-10 h-10 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
              aria-label="Add Event"
            >
              <FaPlus size={14} />
            </button>
          )}
        </div>

        {/* --- CONTROLS ROW (Filters & View) --- */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            {/* View Toggle */}
            <div className={`flex rounded-xl p-1 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              {['month', 'week', 'list'].map((mode) => {
                const isActive = viewMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                        : `text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200`
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            {/* Filter Toggle Button - FIXED FOR LIGHT/DARK MODES */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
                showFilters 
                  ? 'bg-purple-500 border-purple-500 text-white' 
                  : isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FaFilter /> Filters
            </button>
          </div>

          {/* Collapsible Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <div className="flex-1">
                    <label className={`text-xs font-bold mb-1 block ml-1 ${theme.colors.textMuted}`}>Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={`w-full px-3 py-2 text-base rounded-xl border-2 focus:border-purple-500 outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.text} ${theme.colors.border}`}
                    >
                      <option value="all">All Categories</option>
                      {EVENT_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className={`text-xs font-bold mb-1 block ml-1 ${theme.colors.textMuted}`}>Member</label>
                    <select
                      value={filterMember}
                      onChange={(e) => setFilterMember(e.target.value)}
                      className={`w-full px-3 py-2 text-base rounded-xl border-2 focus:border-purple-500 outline-none font-semibold ${theme.colors.bgCard} ${theme.colors.text} ${theme.colors.border}`}
                    >
                      <option value="all">All Members</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- NAVIGATION (Month/Week only) --- */}
        {(viewMode === 'month' || viewMode === 'week') && (
          <div className={`${theme.colors.bgCard} rounded-xl p-3 shadow-sm mb-4 flex items-center justify-between border ${theme.colors.border}`}>
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'text-gray-700'}`}>
              <FaChevronLeft />
            </button>
            <h2 className={`text-lg font-bold ${theme.colors.text}`}>
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'text-gray-700'}`}>
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* --- MONTH VIEW --- */}
      {viewMode === 'month' && (
        <div className={`${theme.colors.bgCard} rounded-2xl p-2 md:p-6 shadow-lg border ${theme.colors.border}`}>
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className={`text-center font-bold text-sm md:text-base py-2 ${theme.colors.text}`}>{day}</div>
            ))}
          </div>
          {/* Calendar Grid */}
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
                  
                  {/* Events Container */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayEvents.map(event => {
                      const category = EVENT_CATEGORIES.find(c => c.value === event.category);
                      return (
                        <div 
                          key={event.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className="cursor-pointer group"
                        >
                          {/* Mobile View: LARGE MINI BLOCK */}
                          <div className={`md:hidden flex items-center gap-1 p-1 rounded-md mb-1 ${category?.bgColor} ${category?.textColor}`}>
                            <span className="text-[10px]">{category?.icon}</span>
                            <span className="text-[9px] font-bold truncate leading-tight">{event.title}</span>
                          </div>
                          
                          {/* Desktop View: Full Badge */}
                          <div className={`hidden md:block text-xs px-1.5 py-0.5 rounded truncate ${category?.bgColor} ${category?.textColor}`}>
                            {category?.icon} {event.title}
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

      {/* --- WEEK VIEW --- */}
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
                      return (
                         <div 
                            key={event.id} 
                            onClick={() => setSelectedEvent(event)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${category?.bgColor} ${category?.textColor}`}
                         >
                           <span>{category?.icon}</span>
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

      {/* --- LIST VIEW --- */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg border ${theme.colors.border}`}>
              <div className="text-6xl mb-4">📅</div>
              <p className={`text-xl font-bold ${theme.colors.textMuted}`}>No events found</p>
            </div>
          ) : (
            filteredEvents.map(event => {
              const category = EVENT_CATEGORIES.find(c => c.value === event.category);
              return (
                <div 
                   key={event.id} 
                   onClick={() => setSelectedEvent(event)}
                   className={`${theme.colors.bgCard} p-4 rounded-xl shadow-sm border ${theme.colors.border} flex items-center gap-4 cursor-pointer hover:shadow-md transition-all`}
                >
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${category?.bgColor}`}>
                      {category?.icon}
                   </div>
                   <div className="flex-1">
                      <h3 className={`font-bold ${theme.colors.text}`}>{event.title}</h3>
                      <p className={`text-xs ${theme.colors.textMuted}`}>{format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'PPP p')}</p>
                   </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* --- BOTTOM SECTION: SYNC COMPONENT --- */}
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
          // Pass isDarkMode to ensure the child component styles correctly
          <div className={`${theme.colors.bgCard} rounded-2xl shadow-sm border ${theme.colors.border} overflow-hidden`}>
             <CalendarShare id={googleCalendarId} isDarkMode={isDarkMode} />
          </div>
        ) : null}
      </div>

      {/* --- MODAL 1: QUICK VIEW EVENT --- */}
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
                   const assigned = members.filter(m => selectedEvent.assignedTo?.includes(m.id));
                   return (
                      <>
                        <div className={`-mt-6 -mx-6 p-6 ${category?.bgColor} mb-4 flex items-start justify-between`}>
                           <div>
                              <div className="text-4xl mb-2">{category?.icon}</div>
                              <h3 className={`text-xl font-bold ${category?.textColor} leading-tight`}>{selectedEvent.title}</h3>
                              <p className={`text-sm font-semibold opacity-80 ${category?.textColor}`}>{category?.label}</p>
                           </div>
                           <button onClick={() => setSelectedEvent(null)} className="bg-white/50 p-2 rounded-full hover:bg-white/80 transition-colors">
                              <FaTimes size={14} className={category?.textColor} />
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
                                 "{selectedEvent.description}"
                              </div>
                           )}
                        </div>

                        {/* Actions */}
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

      {/* --- MODAL 2: ADD EVENT (RESTORED FEATURE RICH) --- */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto border ${theme.colors.border}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold gradient-text">Add Event</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400"><FaTimes size={20}/></button>
              </div>
              <form onSubmit={handleAddEvent} className="space-y-4">
                {/* TITLE */}
                <div>
                  <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Title</label>
                  <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className={`w-full p-3 rounded-xl border ${theme.colors.border} bg-transparent ${theme.colors.text}`} placeholder="Event Title" required />
                </div>
                
                {/* DATES */}
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

                {/* ALL DAY TOGGLE */}
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

                {/* CATEGORY */}
                <div>
                   <label className={`block text-xs font-bold ${theme.colors.textMuted} mb-1`}>Category</label>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                      {EVENT_CATEGORIES.map(cat => (
                         <button type="button" key={cat.value} onClick={() => setNewEvent({...newEvent, category: cat.value})} className={`p-2 rounded-lg border whitespace-nowrap text-xs flex items-center gap-1 ${newEvent.category === cat.value ? 'bg-purple-100 border-purple-500 text-purple-700' : `${theme.colors.border} ${theme.colors.textMuted}`}`}>
                            {cat.icon} {cat.label}
                         </button>
                      ))}
                   </div>
                </div>

                {/* LOCATION */}
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

                {/* ASSIGN TO */}
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

                {/* RECURRING */}
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

                {/* DESCRIPTION */}
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

                {/* SUBMIT */}
                <button type="submit" disabled={syncing} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold shadow-lg mt-2">
                   {syncing ? 'Adding...' : 'Save Event'}
                </button>
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
