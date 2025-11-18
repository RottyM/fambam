'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

const FamilyContext = createContext({});

export const useFamily = () => useContext(FamilyContext);

export function FamilyProvider({ children }) {
  const { userData } = useAuth();
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.familyId) {
      setLoading(false);
      return;
    }

    // Subscribe to family document
    const familyUnsubscribe = onSnapshot(
      doc(db, 'families', userData.familyId),
      (doc) => {
        if (doc.exists()) {
          setFamily({ id: doc.id, ...doc.data() });
        }
      }
    );

    // Subscribe to family members
    const membersUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('familyId', '==', userData.familyId)),
      (snapshot) => {
        const membersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMembers(membersList);
        setLoading(false);
      }
    );

    return () => {
      familyUnsubscribe();
      membersUnsubscribe();
    };
  }, [userData?.familyId]);

  const getMemberById = (memberId) => {
    return members.find(member => member.id === memberId);
  };

  const isParent = () => {
    return userData?.role === 'parent';
  };

  const value = {
    family,
    members,
    loading,
    getMemberById,
    isParent,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
