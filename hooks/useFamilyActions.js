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
      
      // Clean up the error message for the user (removes "INTERNAL" prefixes)
      const message = error.message.replace('INTERNAL', '').replace('UNKNOWN', '').trim();
      
      // Don't toast if it's a specific validation error we want to handle in the UI
      if (!message.includes('cancelled')) {
          toast.error(message || 'Something went wrong');
      }
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // --- 1. CHORES ACTIONS ---
  // Triggers atomic point transaction on the server
  const approveChore = async (familyId, choreId) => {
    return callFunction('approveChoreAndAwardPoints', { familyId, choreId });
  };

  // --- 2. USER PROFILE ACTIONS ---
  // Generates a random avatar without needing client-side logic
  const assignAvatar = async () => {
    return callFunction('assignRandomAvatar');
  };

  // --- 3. CALENDAR ACTIONS ---
  // These talk to Google APIs which must happen on the server
  const createCalendar = async (familyId, familyName) => {
    return callFunction('createFamilyCalendar', { familyId, familyName });
  };

  const syncEventToGoogle = async (familyId, eventId, eventData) => {
    return callFunction('syncEventToGoogleCalendar', { familyId, eventId, eventData });
  };

  const deleteEventFromGoogle = async (familyId, googleEventId) => {
    return callFunction('deleteEventFromGoogleCalendar', { familyId, googleEventId });
  };

  // --- 4. MEMORY ACTIONS ---
  // Deletes both the file (Storage) and the doc (Firestore)
  const removeMemory = async (familyId, memoryId, storagePath) => {
    return callFunction('deleteMemory', { familyId, memoryId, storagePath });
  };

  // --- 5. SYSTEM ACTIONS ---
  const refreshDailyMeme = async () => {
    return callFunction('fetchDailyMemeManual');
  };

  return {
    actionLoading, // Renamed to distinguish from data loading states
    approveChore,
    assignAvatar,
    createCalendar,
    syncEventToGoogle,
    deleteEventFromGoogle,
    removeMemory,
    refreshDailyMeme
  };
}