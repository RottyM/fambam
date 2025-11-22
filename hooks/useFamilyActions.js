import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function useFamilyActions() {
  const [actionLoading, setActionLoading] = useState(false);

  // Helper to wrap function calls with loading state and error handling
  const callFunction = async (functionName, data = {}) => {
    setActionLoading(true);
    try {
      const func = httpsCallable(functions, functionName);
      const result = await func(data);
      return result.data;
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      // Clean up the error message for the user
      const message = error.message.replace('INTERNAL', '').replace('UNKNOWN', '').trim();
      toast.error(message || 'Something went wrong');
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // --- 1. CHORES ACTIONS ---
  const approveChore = async (familyId, choreId) => {
    return callFunction('approveChoreAndAwardPoints', { familyId, choreId });
  };

  // --- 2. AVATARS ACTIONS ---
  const assignAvatar = async () => {
    return callFunction('assignRandomAvatar');
  };

  // --- 3. CALENDAR ACTIONS ---
  const createCalendar = async (familyId, familyName) => {
    return callFunction('createFamilyCalendar', { familyId, familyName });
  };

  const syncEventToGoogle = async (familyId, eventId, eventData) => {
    return callFunction('syncEventToGoogleCalendar', { familyId, eventId, eventData });
  };

  const deleteCalendarEvent = async (familyId, googleEventId) => {
    return callFunction('deleteEventFromGoogleCalendar', { familyId, googleEventId });
  };

  // --- 4. MEMORY ACTIONS ---
  const removeMemory = async (familyId, memoryId, storagePath) => {
    return callFunction('deleteMemory', { familyId, memoryId, storagePath });
  };

  // --- 5. SYSTEM ACTIONS ---
  const refreshDailyMeme = async () => {
    return callFunction('fetchDailyMemeManual');
  };

  // --- 6. MOVIE ACTIONS ---
  const searchMovies = async (query) => {
    return callFunction('searchMovies', { query });
  };

  return {
    actionLoading,
    approveChore,
    assignAvatar,
    createCalendar,
    syncEventToGoogle,
    deleteCalendarEvent,
    removeMemory,
    refreshDailyMeme,
    searchMovies, // <--- EXPOSED
  };
}