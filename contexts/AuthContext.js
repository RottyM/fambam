'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
// Changed to relative path to help resolution in preview
import { auth, db } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- UPDATED: Token Refresh Logic ---
  // Now accepts a 'requiredClaim' so we can wait for specific data (like familyId)
  const waitForClaims = async (user, requiredClaim = 'role') => {
    let retries = 0;
    while (retries < 10) { // Try for max 10 seconds
      try {
        // Force-refresh the token from the server
        const idTokenResult = await user.getIdTokenResult(true);
        
        // Check if the specific claim exists
        if (idTokenResult.claims[requiredClaim]) {
          console.log(`Claim '${requiredClaim}' synced successfully!`);
          return idTokenResult.claims;
        }
        
        console.log(`Waiting for claim '${requiredClaim}'... retry ${retries}`);
        // Wait 1 second before trying again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        retries++;
      } catch (e) {
        console.error("Error waiting for claims", e);
        break;
      }
    }
    console.warn("Timeout waiting for claims to sync.");
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Still fetching doc for frontend display data (avatar, display name, etc)
        try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
            setUserData({
                ...userDoc.data(),
                uid: firebaseUser.uid,
            });
            }
        } catch (error) {
            console.error("Error fetching user doc:", error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password, redirectUrl = '/dashboard') => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      router.push(redirectUrl || '/dashboard');
      return result;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const signUp = async (email, password, displayName, role = 'parent', redirectUrl = '/setup') => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        displayName,
        role,
        points: 0,
        avatar: null,
        createdAt: new Date(),
      });

      // Wait for the Cloud Function to stamp the 'role'
      toast.loading('Setting up your account...');
      await waitForClaims(result.user, 'role');

      toast.success('Account created! Welcome to Family OS!');
      router.push(redirectUrl);
      return result;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const signInWithGoogle = async (redirectUrl) => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          role: 'parent',
          points: 0,
          avatar: { type: 'google', url: result.user.photoURL },
          createdAt: new Date(),
        });

        toast.loading('Finalizing setup...');
        await waitForClaims(result.user, 'role');
        router.push(redirectUrl || '/setup');
      } else {
        router.push(redirectUrl || '/dashboard');
      }
      
      toast.success('Welcome!');
      return result;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Signed out successfully');
      router.push('/');
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    waitForClaims,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}