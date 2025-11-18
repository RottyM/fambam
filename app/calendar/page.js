'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useCalendarEvents } from '@/hooks/useFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

function CalendarContent() {
  const { events, loading } = useCalendarEvents();
  const { userData } = useAuth();
  const { isParent } = useFamily();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
  });
  const [syncing, setSyncing] = useState(false);

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!userData?.familyId) return;

    try {
      setSyncing(true);

      // Add event to Firestore
      const eventRef = await addDoc(
        collection(db, 'families', userData.familyId, 'calendar-events'),
        {
          title: newEvent.title,
          description: newEvent.description,
          start: new Date(newEvent.start),
          end: new Date(newEvent.end),
          createdBy: userData.uid,
          createdAt: serverTimestamp(),
        }
      );

      // Sync to Google Calendar
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
        toast.success('Event added & synced to Google Calendar! 📅');
      } catch (syncError) {
        console.error('Sync error:', syncError);
        toast.success('Event added! (Google Calendar sync pending)');
      }

      setShowAddModal(false);
      setNewEvent({
        title: '',
        description: '',
        start: '',
        end: '',
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
      // Delete from Google Calendar if synced
      if (event.googleEventId) {
        const deleteGoogleEvent = httpsCallable(
          functions,
          'deleteEventFromGoogleCalendar'
        );
        await deleteGoogleEvent({
          familyId: userData.familyId,
          googleEventId: event.googleEventId,
        });
      }

      // Delete from Firestore
      await deleteDoc(
        doc(db, 'families', userData.familyId, 'calendar-events', event.id)
      );

      toast.success('Event deleted!');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">
            <span className="gradient-text">Family Calendar</span>
          </h1>
          <p className="text-gray-600 font-semibold">
            {events.length} upcoming events
          </p>
        </div>

        {isParent() && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <FaPlus /> Add Event
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-xl font-bold text-gray-600">No events yet</p>
          <p className="text-gray-500">
            {isParent()
              ? 'Click "Add Event" to create your first family event'
              : 'Events will appear here when parents add them'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl p-3 text-white text-center min-w-[60px]">
                  <div className="text-2xl font-bold">
                    {format(
                      event.start?.toDate ? event.start.toDate() : new Date(event.start),
                      'd'
                    )}
                  </div>
                  <div className="text-xs font-semibold">
                    {format(
                      event.start?.toDate ? event.start.toDate() : new Date(event.start),
                      'MMM'
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-gray-600 mb-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>🕐</span>
                        <span>
                          {format(
                            event.start?.toDate ? event.start.toDate() : new Date(event.start),
                            'h:mm a'
                          )}
                          {event.end &&
                            ` - ${format(
                              event.end?.toDate ? event.end.toDate() : new Date(event.end),
                              'h:mm a'
                            )}`}
                        </span>
                        {event.googleEventId && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            ✓ Synced
                          </span>
                        )}
                      </div>
                    </div>

                    {isParent() && (
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-3xl font-display font-bold mb-6 gradient-text">
                📅 Add Event
              </h2>

              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    placeholder="Soccer practice, Birthday party, etc."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    placeholder="Additional details..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.start}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, start: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.end}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, end: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div className="flex gap-3 mt-6">
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
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {syncing ? 'Adding...' : 'Add Event'}
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
