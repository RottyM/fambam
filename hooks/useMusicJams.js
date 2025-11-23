'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useMusicJams(activeFilterId = null) {
  const [allJams, setAllJams] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();
  const familyId = userData?.familyId;

  // --- 1. FETCH JAMS & FOLDERS ---
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // A) Fetch Songs
    const jamsRef = collection(db, 'families', familyId, 'music_jams');
    const jamsQuery = query(jamsRef, orderBy('createdAt', 'desc'));

    const unsubJams = onSnapshot(jamsQuery, (snapshot) => {
      const jamsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllJams(jamsData);
    }, (error) => {
        console.error("Error fetching jams:", error);
        toast.error("Could not load music.");
    });

    // B) Fetch Folders
    const foldersRef = collection(db, 'families', familyId, 'music_folders');
    const foldersQuery = query(foldersRef, orderBy('createdAt', 'asc'));

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
        const foldersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFolders(foldersData);
      }, (error) => {
          console.error("Error fetching folders:", error);
      });

    setLoading(false);

    return () => {
        unsubJams();
        unsubFolders();
    };
  }, [familyId]);


  // --- 2. FILTERING ---
  const filteredJams = useMemo(() => {
    if (!activeFilterId || activeFilterId === 'all') {
        return allJams;
    }
    return allJams.filter(jam => jam.folderIds?.includes(activeFilterId));
  }, [allJams, activeFilterId]);


  // --- JAM ACTIONS ---
  const addJam = async (jamData) => {
    if (!familyId || !userData) return;
    try {
      await addDoc(collection(db, 'families', familyId, 'music_jams'), {
        ...jamData,
        userId: userData.uid,
        likes: [],
        folderIds: activeFilterId && activeFilterId !== 'all' ? [activeFilterId] : [], // Auto-add to current folder if active
        createdAt: serverTimestamp(),
      });
      toast.success('Jam posted! 🎵');
    } catch (error) {
      console.error(error);
      toast.error("Failed to post jam.");
    }
  };

  const deleteJam = async (jamId) => {
    if (!familyId) return;
    try {
      await deleteDoc(doc(db, 'families', familyId, 'music_jams', jamId));
      toast.success('Jam deleted.');
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete jam.");
    }
  };

  const toggleLike = async (jamId, isLiked) => {
    if (!familyId || !userData) return;
    const jamRef = doc(db, 'families', familyId, 'music_jams', jamId);
    try {
      if (isLiked) {
        await updateDoc(jamRef, { likes: arrayRemove(userData.uid) });
      } else {
        await updateDoc(jamRef, { likes: arrayUnion(userData.uid) });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- FOLDER ACTIONS ---

  const createFolder = async (name) => {
    if (!familyId || !name.trim()) return;
    try {
        await addDoc(collection(db, 'families', familyId, 'music_folders'), {
            name: name.trim(),
            createdAt: serverTimestamp(),
        });
        toast.success(`Playlist "${name}" created!`);
    } catch (error) {
        console.error(error);
        toast.error("Could not create playlist.");
    }
  };

  // NEW: Rename Folder
  const renameFolder = async (folderId, newName) => {
    if (!familyId || !folderId || !newName.trim()) return;
    try {
        await updateDoc(doc(db, 'families', familyId, 'music_folders', folderId), {
            name: newName.trim()
        });
        toast.success("Playlist renamed.");
    } catch (error) {
        console.error(error);
        toast.error("Update failed.");
    }
  };

  // NEW: Delete Folder
  const deleteFolder = async (folderId) => {
    if (!familyId || !folderId) return;
    try {
        await deleteDoc(doc(db, 'families', familyId, 'music_folders', folderId));
        toast.success("Playlist deleted.");
    } catch (error) {
        console.error(error);
        toast.error("Delete failed.");
    }
  };

  const assignJamToFolder = async (jamId, folderId) => {
      if (!familyId || !jamId || !folderId) return;
      const jamRef = doc(db, 'families', familyId, 'music_jams', jamId);
      try {
        await updateDoc(jamRef, { folderIds: arrayUnion(folderId) });
        toast.success("Added to playlist!");
      } catch (error) {
          console.error(error);
          toast.error("Could not move song.");
      }
  };

  return { 
      jams: filteredJams, 
      folders, 
      loading, 
      addJam, 
      deleteJam, 
      toggleLike,
      createFolder,
      renameFolder, // <--- Exported
      deleteFolder, // <--- Exported
      assignJamToFolder
  };
}