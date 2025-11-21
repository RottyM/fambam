'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useCalendarEvents } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { FaPlus, FaTrash, FaClock, FaMapMarkerAlt, FaUser, FaTimes, FaCalendarAlt, FaList, FaCalendarWeek, FaFilter } from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
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

const VIEW_MODES = ['month', 'week', 'list'];

function CalendarContent() {
  const { events, loading } = useCalendarEvents();
  const { userData } = useAuth();
  const { members, isParent } = useFamily();
  const { theme } = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState('all');

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    category: 'other',
    location: '',
    assignedTo: [],
    allDay: false,
    recurring: 'none',
  });
  const [syncing, setSyncing] = useState(false);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!userData?.familyId) return;

    try {
      setSyncing(true);

      const eventRef = await addDoc(
        collection(db, 'families', userData.familyId, 'calendar-events'),
        {
          title: newEvent.title,
          description: newEvent.description,
          start: new Date(newEvent.start),
          end: new Date(newEvent.end),
          category: newEvent.category,
          location: newEvent.location,
          assignedTo: newEvent.assignedTo,
          allDay: newEvent.allDay,
          recurring: newEvent.recurring,
          createdBy: userData.uid,
          createdAt: serverTimestamp(),
        }
      );

      try {
        const syncEvent = httpsCallable(functions, 'syncEventToGoogleCalendar');
        await syncEvent({
          familyId: userData.familyId,
          eventId: eventRef.id,
          eventData: {
            title: newEvent.title,
            description: newEvent.description,
            start: new Date(newEvent.start).toISOString(),
            end: new Date(newEvent.end).toISOString(),
          },
        });
        toast.success('Event added & synced! 📅');
      } catch (syncError) {
        console.error('Sync error:', syncError);
        toast.success('Event added!');
      }

      setShowAddModal(false);
      setNewEvent({
        title: '',
        description: '',
        start: '',
        end: '',
        category: 'other',
        location: '',
        assignedTo: [],
        allDay: false,
        recurring: 'none',
      });
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('Failed to add event');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    if (!userData?.familyId) return;
    if (!confirm(`Delete "${event.title}"?`)) return;

    try {
      if (event.googleEventId) {
        const deleteGoogleEvent = httpsCallable(functions, 'deleteEventFromGoogleCalendar');
        await deleteGoogleEvent({
          familyId: userData.familyId,
          googleEventId: event.googleEventId,
        });
      }

      await deleteDoc(doc(db, 'families', userData.familyId, 'calendar-events', event.id));
      toast.success('Event deleted!');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const toggleMemberAssignment = (memberId) => {
    const current = newEvent.assignedTo || [];
    if (current.includes(memberId)) {
      setNewEvent({ ...newEvent, assignedTo: current.filter(id => id !== memberId) });
    } else {
      setNewEvent({ ...newEvent, assignedTo: [...current, memberId] });
    }
  };

  const filteredEvents = events.filter(event => {
    if (filterCategory !== 'all' && event.category !== filterCategory) return false;
    if (filterMember !== 'all' && !event.assignedTo?.includes(filterMember)) return false;
    return true;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

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
          <div className="text-6xl mb-4 animate-bounce">📅</div>
          <p className="text-xl font-bold text-purple-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">Family Calendar</span>
            </h1>
            <p className="text-sm md:text-base text-gray-600 font-semibold">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </p>
          </div>

          {isParent() && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 md:px-6 py-3 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              aria-label="Add Event"
            >
              <FaPlus /> <span className="hidden sm:inline">Add Event</span>
            </button>
          )}
        </div>

        {/* View Mode & Filters */}
        <div className="flex flex-col gap-3 mb-6">
          {/* View Mode Selector - Horizontal scroll on mobile */}
          <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-2 min-w-min">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 md:px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${
                  viewMode === 'month'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaCalendarAlt /> Month
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 md:px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${
                  viewMode === 'week'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaCalendarWeek /> Week
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 md:px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm md:text-base ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaList /> List
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`px-3 md:px-4 py-2 text-sm md:text-base rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold ${theme.colors.bgCard} flex-1`}
            >
              <option value="all">All Categories</option>
              {EVENT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className={`px-3 md:px-4 py-2 text-sm md:text-base rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold ${theme.colors.bgCard} flex-1`}
            >
              <option value="all">All Members</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Month Navigation (for month/week view) */}
      {(viewMode === 'month' || viewMode === 'week') && (
        <div className={`${theme.colors.bgCard} rounded-2xl p-4 shadow-lg mb-6 flex items-center justify-between`}>
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition-all"
          >
            ← Previous
          </button>
          <h2 className="text-2xl font-bold gradient-text">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className={`${theme.colors.bgCard} rounded-2xl p-6 shadow-lg`}>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-bold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 rounded-xl border-2 transition-all ${
                    isCurrentDay
                      ? 'border-purple-500 bg-purple-50'
                      : isCurrentMonth
                      ? `border-gray-200 hover:border-purple-300 ${theme.colors.bgCard}`
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-bold mb-1 ${isCurrentDay ? 'text-purple-700' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => {
                      const category = EVENT_CATEGORIES.find(c => c.value === event.category);
                      return (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded ${category?.bgColor} ${category?.textColor} truncate cursor-pointer hover:scale-105 transition-all`}
                          title={event.title}
                        >
                          {category?.icon} {event.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 font-semibold">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className={`${theme.colors.bgCard} rounded-2xl p-6 shadow-lg`}>
          <div className="grid grid-cols-7 gap-4">
            {eachDayOfInterval({
              start: startOfWeek(currentMonth),
              end: endOfWeek(currentMonth),
            }).map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentDay = isToday(day);

              return (
                <div key={idx} className="space-y-3">
                  <div className={`text-center py-3 rounded-xl ${isCurrentDay ? 'bg-purple-500 text-white' : 'bg-gray-100'}`}>
                    <div className="text-xs font-semibold">{format(day, 'EEE')}</div>
                    <div className="text-2xl font-bold">{format(day, 'd')}</div>
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map(event => {
                      const category = EVENT_CATEGORIES.find(c => c.value === event.category);
                      return (
                        <div
                          key={event.id}
                          className={`p-3 rounded-xl ${category?.bgColor} ${category?.textColor} cursor-pointer hover:scale-105 transition-all`}
                        >
                          <div className="font-bold text-sm">{category?.icon} {event.title}</div>
                          <div className="text-xs mt-1">
                            {format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'h:mm a')}
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

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {filteredEvents.length === 0 ? (
            <div className={`${theme.colors.bgCard} rounded-2xl p-12 text-center shadow-lg`}>
              <div className="text-6xl mb-4">📅</div>
              <p className={`text-xl font-bold ${theme.colors.textMuted}`}>No events yet</p>
              <p className={theme.colors.textMuted}>
                {isParent()
                  ? 'Click "Add Event" to create your first family event'
                  : 'Events will appear here when parents add them'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map(event => {
                const category = EVENT_CATEGORIES.find(c => c.value === event.category);
                const assignedMembers = members.filter(m => event.assignedTo?.includes(m.id));

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${theme.colors.bgCard} rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all`}
                  >
                    <div className={`bg-gradient-to-r ${category?.color || 'from-gray-400 to-gray-500'} p-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{category?.icon || '📌'}</div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{event.title}</h3>
                            <p className="text-white/80 text-sm">{category?.label}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">
                            {format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'd')}
                          </div>
                          <div className="text-white/80 text-sm">
                            {format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'MMM')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {event.description && (
                        <p className={`${theme.colors.textMuted} mb-4`}>{event.description}</p>
                      )}

                      <div className="space-y-3 mb-4">
                        <div className={`flex items-center gap-3 ${theme.colors.text}`}>
                          <FaClock className="text-blue-500" />
                          <span className="font-semibold">
                            {format(event.start?.toDate ? event.start.toDate() : new Date(event.start), 'h:mm a')}
                            {event.end && ` - ${format(event.end?.toDate ? event.end.toDate() : new Date(event.end), 'h:mm a')}`}
                          </span>
                          {event.allDay && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">All Day</span>}
                        </div>

                        {event.location && (
                          <div className={`flex items-center gap-3 ${theme.colors.text}`}>
                            <FaMapMarkerAlt className="text-red-500" />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {assignedMembers.length > 0 && (
                          <div className="flex items-center gap-3">
                            <FaUser className="text-purple-500" />
                            <div className="flex items-center gap-2">
                              {assignedMembers.map(member => (
                                <div key={member.id} className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-full">
                                  <UserAvatar user={member} size={24} />
                                  <span className="text-sm font-semibold text-purple-800">{member.displayName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {event.recurring && event.recurring !== 'none' && (
                          <div className={`flex items-center gap-3 ${theme.colors.text}`}>
                            <span className="text-lg">🔄</span>
                            <span className="text-sm capitalize">{event.recurring}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div>
                          {event.googleEventId && (
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                              ✓ Synced to Google
                            </span>
                          )}
                        </div>

                        {isParent() && (
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className={`${theme.colors.bgCard} rounded-3xl p-6 max-w-2xl w-full shadow-2xl my-8 max-h-[95vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold gradient-text">
                  📅 Add Event
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="space-y-6">
                {/* Event Title */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Soccer practice, Birthday party, etc."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {EVENT_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, category: cat.value })}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          newEvent.category === cat.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{cat.icon}</div>
                        <div className={`text-xs font-bold ${theme.colors.text}`}>{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.start}
                      onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.end}
                      onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* All Day Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={newEvent.allDay}
                    onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="allDay" className={`font-semibold ${theme.colors.text}`}>
                    All-day event
                  </label>
                </div>

                {/* Location */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Soccer field, Doctor's office, etc."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                  />
                </div>

                {/* Assign To */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Assign To (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMemberAssignment(member.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                          newEvent.assignedTo?.includes(member.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <UserAvatar user={member} size={24} />
                        <span className="font-semibold text-sm">{member.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recurring */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Repeat
                  </label>
                  <select
                    value={newEvent.recurring}
                    onChange={(e) => setNewEvent({ ...newEvent, recurring: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold ${theme.colors.bgCard}`}
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-bold ${theme.colors.text} mb-2`}>
                    Description (optional)
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Additional details..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                    disabled={syncing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={syncing}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {syncing ? 'Adding...' : <><FaPlus /> Add Event</>}
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

export default function CalendarPage() {
  return (
    <DashboardLayout>
      <CalendarContent />
    </DashboardLayout>
  );
}
