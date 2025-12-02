import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  writeBatch,
  limit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// --- 1. TODOS ---
export function useTodos(options = {}) {
  const { realtime = true, statusFilter = null } = options;
  const { userData } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const todosCollectionRef = collection(db, 'families', userData.familyId, 'todos');
    let q = query(todosCollectionRef, orderBy('createdAt', 'desc'));

    if (statusFilter === 'pending') {
      q = query(q, where('completed', '==', false));
    } else if (statusFilter === 'completed') {
      q = query(q, where('completed', '==', true));
    }

    if (realtime) {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const todosList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTodos(todosList);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      const fetchTodos = async () => {
        try {
          const querySnapshot = await getDocs(q);
          const todosList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTodos(todosList);
        } catch (error) {
          console.error("Error fetching todos: ", error);
          toast.error("Failed to load todos.");
        } finally {
          setLoading(false);
        }
      };
      fetchTodos();
      // For non-realtime, there's no unsubscribe, so return a no-op function
      return () => {};
    }
  }, [userData?.familyId, realtime, statusFilter]);

  const addTodo = async (todoData) => {
    try {
      const dataToAdd = { ...todoData };
      if (dataToAdd.dueDate) {
        dataToAdd.dueDate = new Date(dataToAdd.dueDate.replace(/-/g, '/'));
      } else {
        delete dataToAdd.dueDate;
      }

      await addDoc(collection(db, 'families', userData.familyId, 'todos'), {
        ...dataToAdd,
        assignedBy: userData.uid,
        completed: false,
        createdAt: serverTimestamp(),
      });
      toast.success('Todo added!');
    } catch (error) {
      toast.error('Failed to add todo');
      console.error(error);
    }
  };

  const updateTodo = async (todoId, updates) => {
    try {
      const todoRef = doc(db, 'families', userData.familyId, 'todos', todoId);
      await updateDoc(todoRef, updates);
      toast.success('Todo updated!');
    } catch (error) {
      toast.error('Failed to update todo');
      console.error(error);
    }
  };

  const toggleTodo = async (todoId, currentStatus) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'todos', todoId),
        {
          completed: !currentStatus,
          completedAt: !currentStatus ? serverTimestamp() : null,
        }
      );
    } catch (error) {
      toast.error('Failed to update todo');
      console.error(error);
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      await deleteDoc(doc(db, 'families', userData.familyId, 'todos', todoId));
      toast.success('Todo deleted!');
    } catch (error) {
      toast.error('Failed to delete todo');
      console.error(error);
    }
  };

  return { todos, loading, addTodo, updateTodo, toggleTodo, deleteTodo };
}

// --- 2. CHORES ---
export function useChores(options = {}) {
  const { realtime = true, statusFilter = null } = options;
  const { userData } = useAuth();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const choresCollectionRef = collection(db, 'families', userData.familyId, 'chores');
    let q = query(choresCollectionRef, orderBy('createdAt', 'desc'));

    if (statusFilter) {
      q = query(q, where('status', '==', statusFilter));
    }

    if (realtime) {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const choresList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChores(choresList);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      const fetchChores = async () => {
        try {
          const querySnapshot = await getDocs(q);
          const choresList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setChores(choresList);
        } catch (error) {
          console.error("Error fetching chores: ", error);
          toast.error("Failed to load chores.");
        } finally {
          setLoading(false);
        }
      };
      fetchChores();
      return () => {};
    }
  }, [userData?.familyId, realtime, statusFilter]);

  const addChore = async (choreData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'chores'), {
        ...choreData,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Chore created!');
    } catch (error) {
      toast.error('Failed to create chore');
      console.error(error);
    }
  };

  const updateChore = async (choreId, updates) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'chores', choreId),
        updates
      );
      toast.success('Chore updated!');
    } catch (error) {
      toast.error('Failed to update chore');
      console.error(error);
    }
  };

  const submitChore = async (choreId) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'chores', choreId),
        {
          status: 'submitted',
          submittedAt: serverTimestamp(),
        }
      );
      toast.success('Chore submitted for approval!');
    } catch (error) {
      toast.error('Failed to submit chore');
      console.error(error);
    }
  };

  const deleteChore = async (choreId) => {
    try {
      await deleteDoc(doc(db, 'families', userData.familyId, 'chores', choreId));
      toast.success('Chore deleted!');
    } catch (error) {
      toast.error('Failed to delete chore');
      console.error(error);
    }
  };

  return { chores, loading, addChore, updateChore, submitChore, deleteChore };
}

// --- 3. CALENDAR ---
export function useCalendarEvents(options = {}) {
  const { realtime = true, excludePastEvents = false } = options;
  const { userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const eventsCollectionRef = collection(db, 'families', userData.familyId, 'calendar-events');
    let q = query(eventsCollectionRef, orderBy('start', 'asc'));

    if (excludePastEvents) {
      q = query(q, where('start', '>=', new Date()));
    }

    if (realtime) {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const eventsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEvents(eventsList);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      const fetchEvents = async () => {
        try {
          const querySnapshot = await getDocs(q);
          const eventsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEvents(eventsList);
        } catch (error) {
          console.error("Error fetching calendar events: ", error);
          toast.error("Failed to load calendar events.");
        } finally {
          setLoading(false);
        }
      };
      fetchEvents();
      return () => {};
    }
  }, [userData?.familyId, realtime, excludePastEvents]);

  return { events, loading };
}

// --- 4. DOCUMENTS ---
export function useDocuments() {
  const { userData } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'documents'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDocuments(docsList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  return { documents, loading };
}

// --- 5. MEMORIES ---
export function useMemories(options = {}) {
  const { realtime = true, latestOnly = false } = options;
  const { userData } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const memoriesCollectionRef = collection(db, 'families', userData.familyId, 'memories');
    let baseQuery = query(memoriesCollectionRef, orderBy('uploadedAt', 'desc'));

    if (latestOnly) {
      baseQuery = query(baseQuery, limit(1));
    }

    if (realtime) {
      const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
        const memoriesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMemories(memoriesList);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      const fetchMemories = async () => {
        try {
          const querySnapshot = await getDocs(baseQuery);
          const memoriesList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMemories(memoriesList);
        } catch (error) {
          console.error("Error fetching memories: ", error);
          toast.error("Failed to load memories.");
        } finally {
          setLoading(false);
        }
      };
      fetchMemories();
      return () => {};
    }
  }, [userData?.familyId, realtime, latestOnly]);

  const updateMemory = async (memoryId, updates) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'memories', memoryId),
        updates
      );
      toast.success('Memory updated!');
    } catch (error) {
      toast.error('Failed to update memory');
      console.error(error);
    }
  };

  return { memories, loading, updateMemory };
}

// --- 5b. PAGINATED MEMORIES ---
export function usePaginatedMemories(pageSize = 30) {
  const { userData } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);

  const loadPage = async (cursor = null, append = false) => {
    if (!userData?.familyId) return;

    const baseQuery = query(
      collection(db, 'families', userData.familyId, 'memories'),
      orderBy('uploadedAt', 'desc'),
      limit(pageSize)
    );

    const pageQuery = cursor ? query(baseQuery, startAfter(cursor)) : baseQuery;

    const snapshot = await getDocs(pageQuery);
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
    setHasMore(snapshot.docs.length === pageSize);

    setMemories(prev => {
      if (!append) return docs;
      const seen = new Set(prev.map(m => m.id));
      const merged = [...prev];
      docs.forEach(d => {
        if (!seen.has(d.id)) merged.push(d);
      });
      return merged;
    });
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadPage(lastDocRef.current, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    lastDocRef.current = null;
    setHasMore(true);
    await loadPage(null, false);
    setLoading(false);
  };

  useEffect(() => {
    setMemories([]);
    lastDocRef.current = null;
    setHasMore(true);
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }
    refresh();
  }, [userData?.familyId]);

  const updateMemoryLocal = (memoryId, updates) => {
    setMemories(prev =>
      prev.map(m => (m.id === memoryId ? { ...m, ...updates } : m))
    );
  };

  const removeMemoryLocal = (memoryId) => {
    setMemories(prev => prev.filter(m => m.id !== memoryId));
  };

  return {
    memories,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    updateMemoryLocal,
    removeMemoryLocal,
  };
}

// --- 5c. MEMORIES COUNT ---
export function useMemoriesCount() {
  const { userData } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const fetchCount = async () => {
      try {
        const memoriesCollectionRef = collection(db, 'families', userData.familyId, 'memories');
        const q = query(memoriesCollectionRef);
        const snapshot = await getCountFromServer(q);
        setCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching memories count: ", error);
        toast.error("Failed to load memories count.");
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [userData?.familyId]);

  return { count, loading };
}

// --- 6. FOLDERS ---
export function useMemoriesFolders() {
  const { userData } = useAuth();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'folders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const foldersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFolders(foldersList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addFolder = async (folderData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'folders'), {
        ...folderData,
        createdBy: userData.uid,
        createdAt: serverTimestamp(),
      });
      toast.success('Folder created!');
    } catch (error) {
      toast.error('Failed to create folder');
      console.error(error);
    }
  };

  const deleteFolder = async (folderId) => {
    try {
      const folderRef = doc(db, 'families', userData.familyId, 'folders', folderId);
      const memoriesQuery = query(
        collection(db, 'families', userData.familyId, 'memories'),
        where('folderId', '==', folderId)
      );
      const memoriesSnapshot = await getDocs(memoriesQuery);
      const batch = writeBatch(db);

      memoriesSnapshot.forEach((memoryDoc) => {
        const memoryRef = doc(db, 'families', userData.familyId, 'memories', memoryDoc.id);
        batch.update(memoryRef, { folderId: null });
      });

      batch.delete(folderRef);
      await batch.commit();
      
      toast.success('Folder deleted and memories unsorted!');
    } catch (error) {
      toast.error('Failed to delete folder');
      console.error(error);
    }
  };

  return { folders, loading, addFolder, deleteFolder };
}

// --- 7. MEME ---
export function useDailyMeme() {
  const [meme, setMeme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'app-config', 'daily-meme'),
      (doc) => {
        if (doc.exists()) {
          setMeme(doc.data());
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { meme, loading };
}

// --- 8. GROCERIES ---
export function useGroceries() {
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userData } = useAuth();

  const getCollectionRef = () => {
    if (userData?.familyId) {
      return collection(db, "families", userData.familyId, "groceries");
    } else if (user) {
      return collection(db, "users", user.uid, "groceries");
    }
    return null;
  };

  useEffect(() => {
    const colRef = getCollectionRef();
    if (!colRef) {
      setLoading(false);
      return;
    }

    const q = query(colRef, orderBy("checked", "asc"), orderBy("addedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setGroceries(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching groceries:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userData]);

  const addGroceryItem = async (item) => {
    const colRef = getCollectionRef();
    if (!colRef) return;
    await addDoc(colRef, {
      name: item.name,
      quantity: item.quantity || "",
      category: item.category || "other",
      checked: false,
      addedAt: serverTimestamp(),
    });
  };

  const toggleGroceryItem = async (id, currentStatus) => {
    if (!userData?.familyId && !user) return;
    const collectionPath = userData?.familyId 
      ? `families/${userData.familyId}/groceries` 
      : `users/${user.uid}/groceries`;
    
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, { checked: currentStatus });
  };

  const deleteGroceryItem = async (id) => {
    if (!userData?.familyId && !user) return;
    const collectionPath = userData?.familyId 
      ? `families/${userData.familyId}/groceries` 
      : `users/${user.uid}/groceries`;

    const docRef = doc(db, collectionPath, id);
    await deleteDoc(docRef);
  };

  const updateGroceryItem = async (id, updates) => {
    if (!userData?.familyId && !user) return;
    const collectionPath = userData?.familyId 
      ? `families/${userData.familyId}/groceries` 
      : `users/${user.uid}/groceries`;

    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, updates);
  };

  const clearCheckedItems = async () => {
    const batch = writeBatch(db);
    groceries.filter(i => i.checked).forEach((item) => {
      const collectionPath = userData?.familyId 
        ? `families/${userData.familyId}/groceries` 
        : `users/${user.uid}/groceries`;
      const docRef = doc(db, collectionPath, item.id);
      batch.delete(docRef);
    });
    await batch.commit();
  };

  const clearAllItems = async () => {
    const batch = writeBatch(db);
    groceries.forEach((item) => {
      const collectionPath = userData?.familyId 
        ? `families/${userData.familyId}/groceries` 
        : `users/${user.uid}/groceries`;
      const docRef = doc(db, collectionPath, item.id);
      batch.delete(docRef);
    });
    await batch.commit();
  };

  return {
    groceries,
    loading,
    addGroceryItem,
    toggleGroceryItem,
    deleteGroceryItem,
    updateGroceryItem,
    clearCheckedItems,
    clearAllItems,
  };
}

// --- 9. RECIPES ---
export function useRecipes() {
  const { userData } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'recipes'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(recipesList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addRecipe = async (recipeData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'recipes'), {
        ...recipeData,
        createdBy: userData.uid,
        createdAt: serverTimestamp(),
        tutorialVideoUrl: '', 
      });
      toast.success('Recipe added!');
    } catch (error) {
      toast.error('Failed to add recipe');
      console.error(error);
    }
  };

  const updateRecipe = async (recipeId, updates) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'recipes', recipeId),
        {
          ...updates,
          updatedAt: serverTimestamp(),
        }
      );
      toast.success('Recipe updated!');
    } catch (error) {
      toast.error('Failed to update recipe');
      console.error(error);
    }
  };

  const deleteRecipe = async (recipeId) => {
    try {
      await deleteDoc(
        doc(db, 'families', userData.familyId, 'recipes', recipeId)
      );
      toast.success('Recipe deleted!');
    } catch (error) {
      toast.error('Failed to delete recipe');
      console.error(error);
    }
  };

  return { recipes, loading, addRecipe, updateRecipe, deleteRecipe };
}

// --- 10. MEAL PLAN ---
export function useMealPlan() {
  const { userData } = useAuth();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'meal-plan'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mealsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMeals(mealsList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addMeal = async (mealData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'meal-plan'), {
        ...mealData,
        createdBy: userData.uid,
        createdAt: serverTimestamp(),
      });
      toast.success('Meal planned!');
    } catch (error) {
      toast.error('Failed to add meal');
      console.error(error);
    }
  };

  const deleteMeal = async (mealId) => {
    try {
      await deleteDoc(
        doc(db, 'families', userData.familyId, 'meal-plan', mealId)
      );
      toast.success('Meal removed!');
    } catch (error) {
      toast.error('Failed to delete meal');
      console.error(error);
    }
  };

  return { meals, loading, addMeal, deleteMeal };
}

// --- 11. CREDENTIALS ---
export function useCredentials() {
  const { userData } = useAuth();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'credentials'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const credentialsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCredentials(credentialsList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addCredential = async (credentialData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'credentials'), {
        ...credentialData,
        createdBy: userData.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Credential added!');
    } catch (error) {
      toast.error('Failed to add credential');
      console.error(error);
    }
  };

  const updateCredential = async (credentialId, updates) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'credentials', credentialId),
        {
          ...updates,
          updatedAt: serverTimestamp(),
        }
      );
      toast.success('Credential updated!');
    } catch (error) {
      toast.error('Failed to update credential');
      console.error(error);
    }
  };

  const deleteCredential = async (credentialId) => {
    try {
      await deleteDoc(
        doc(db, 'families', userData.familyId, 'credentials', credentialId)
      );
      toast.success('Credential deleted!');
    } catch (error) {
      toast.error('Failed to delete credential');
      console.error(error);
    }
  };

  return { credentials, loading, addCredential, updateCredential, deleteCredential };
}

// --- 12. MOVIES ---
export function useMovies() {
  const { userData } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'movies'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const moviesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMovies(moviesList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addMovie = async (movieData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'movies'), {
        ...movieData,
        addedBy: userData.uid,
        watched: false,
        votes: [],
        createdAt: serverTimestamp(),
      });
      toast.success('Movie added to list!');
    } catch (error) {
      toast.error('Failed to add movie');
      console.error(error);
    }
  };

  const toggleWatched = async (movieId, currentStatus) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'movies', movieId),
        { watched: !currentStatus }
      );
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const toggleVote = async (movieId, currentVotes) => {
    const userId = userData.uid;
    const hasVoted = currentVotes?.includes(userId);
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'movies', movieId),
        {
          votes: hasVoted ? arrayRemove(userId) : arrayUnion(userId)
        }
      );
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to vote');
    }
  };

  const deleteMovie = async (movieId) => {
    try {
      await deleteDoc(
        doc(db, 'families', userData.familyId, 'movies', movieId)
      );
      toast.success('Movie removed!');
    } catch (error) {
      toast.error('Failed to delete movie');
      console.error(error);
    }
  };

  return { movies, loading, addMovie, toggleWatched, toggleVote, deleteMovie };
}

// --- 13. PANTRY (Added Correctly!) ---
export function usePantry() {
  const { userData } = useAuth();
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'pantry'),
      orderBy('category', 'asc'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPantryItems(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addPantryItem = async (item) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'pantry'), {
        name: item.name,
        quantity: item.quantity || "1",
        category: item.category || "other",
        addedAt: serverTimestamp(),
      });
      toast.success('Added to Pantry');
    } catch (error) {
      console.error(error);
      toast.error('Failed to add');
    }
  };

  const updatePantryItem = async (id, updates) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'pantry', id),
        updates
      );
      toast.success('Pantry item updated');
    } catch (error) {
      console.error(error);
      toast.error('Update failed');
    }
  };

  const deletePantryItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'families', userData.familyId, 'pantry', id));
      toast.success('Removed from pantry');
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  return { pantryItems, loading, addPantryItem, updatePantryItem, deletePantryItem };
}