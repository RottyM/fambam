import { useState, useEffect } from 'react';
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// Hook for Todos
export function useTodos() {
  const { userData } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todosList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTodos(todosList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addTodo = async (todoData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'todos'), {
        ...todoData,
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
      await updateDoc(
        doc(db, 'families', userData.familyId, 'todos', todoId),
        updates
      );
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

// Hook for Chores
export function useChores() {
  const { userData } = useAuth();
  const [chores, setChores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'chores'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const choresList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChores(choresList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

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

// Hook for Calendar Events
export function useCalendarEvents() {
  const { userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'calendar-events'),
      orderBy('start', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  return { events, loading };
}

// Hook for Documents
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

// Hook for Memories
export function useMemories() {
  const { userData } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'memories'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoriesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMemories(memoriesList);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  return { memories, loading };
}

// Hook for Daily Meme
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

// Hook for Grocery List
export function useGroceries() {
  const { userData } = useAuth();
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'families', userData.familyId, 'groceries'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroceries(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [userData?.familyId]);

  const addGroceryItem = async (itemData) => {
    try {
      await addDoc(collection(db, 'families', userData.familyId, 'groceries'), {
        ...itemData,
        checked: false,
        addedBy: userData.uid,
        createdAt: serverTimestamp(),
      });
      toast.success('Item added to grocery list!');
    } catch (error) {
      toast.error('Failed to add item');
      console.error(error);
    }
  };

  const toggleGroceryItem = async (itemId, currentChecked) => {
    try {
      await updateDoc(
        doc(db, 'families', userData.familyId, 'groceries', itemId),
        { checked: !currentChecked }
      );
    } catch (error) {
      toast.error('Failed to update item');
      console.error(error);
    }
  };

  const deleteGroceryItem = async (itemId) => {
    try {
      await deleteDoc(
        doc(db, 'families', userData.familyId, 'groceries', itemId)
      );
      toast.success('Item removed!');
    } catch (error) {
      toast.error('Failed to delete item');
      console.error(error);
    }
  };

  const clearCheckedItems = async () => {
    try {
      const checkedItems = groceries.filter(item => item.checked);
      await Promise.all(
        checkedItems.map(item =>
          deleteDoc(doc(db, 'families', userData.familyId, 'groceries', item.id))
        )
      );
      toast.success('Cleared checked items!');
    } catch (error) {
      toast.error('Failed to clear items');
      console.error(error);
    }
  };

  const clearAllItems = async () => {
    try {
      await Promise.all(
        groceries.map(item =>
          deleteDoc(doc(db, 'families', userData.familyId, 'groceries', item.id))
        )
      );
      toast.success('All items cleared!');
    } catch (error) {
      toast.error('Failed to clear all items');
      console.error(error);
    }
  };

  return {
    groceries,
    loading,
    addGroceryItem,
    toggleGroceryItem,
    deleteGroceryItem,
    clearCheckedItems,
    clearAllItems,
  };
}

// Hook for Recipes
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
      });
      toast.success('Recipe added!');
    } catch (error) {
      toast.error('Failed to add recipe');
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

  return { recipes, loading, addRecipe, deleteRecipe };
}

// Hook for Meal Plan
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

// Hook for Family Credentials
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
