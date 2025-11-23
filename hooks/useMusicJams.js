import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useMusicJams() {
  const [jams, setJams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();
  const familyId = userData?.familyId;

  // 1. Fetch jams in real-time
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const jamsRef = collection(db, 'families', familyId, 'music_jams');
    const q = query(jamsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJams(jamsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jams:", error);
      toast.error("Failed to load jams.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

  // 2. Add a new jam
  const addJam = async (jamData) => {
    if (!familyId || !userData) return;
    try {
      await addDoc(collection(db, 'families', familyId, 'music_jams'), {
        ...jamData,
        userId: userData.uid, // Store who posted it
        createdAt: serverTimestamp(),
      });
      toast.success('Jam posted! 🎵');
    } catch (error) {
      console.error("Error adding jam:", error);
      toast.error("Failed to post jam.");
      throw error; // Re-throw so the modal can handle it
    }
  };

  // 3. Delete a jam
  const deleteJam = async (jamId) => {
    if (!familyId) return;
    try {
      await deleteDoc(doc(db, 'families', familyId, 'music_jams', jamId));
      toast.success('Jam deleted.');
    } catch (error) {
      console.error("Error deleting jam:", error);
      toast.error("Failed to delete jam.");
    }
  };

  return { jams, loading, addJam, deleteJam };
}