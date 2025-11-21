import { useEffect, useState } from 'react';
import { messaging, db } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (!user || !messaging) return;

    const requestPermission = async () => {
      try {
        const status = await Notification.requestPermission();
        setPermission(status);

        if (status === 'granted') {
          // Get the token
          const currentToken = await getToken(messaging, {
            // You can get this VAPID key from Firebase Console -> Cloud Messaging -> Web Config
            // If you don't have one yet, you can leave it empty for now, but it's recommended.
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
          });

          if (currentToken) {
            console.log('FCM Token:', currentToken);
            
            // Save token to user profile in Firestore
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              fcmToken: currentToken,
              notificationsEnabled: true
            });
          }
        } else {
            console.log('Notification permission denied');
            // Optionally update Firestore to reflect this
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              notificationsEnabled: false
            });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    requestPermission();

    // Listen for foreground messages (when app is open)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground Message:', payload);
      toast(payload.notification.body, {
        icon: '🔔',
        duration: 5000,
        style: {
            border: '1px solid #713200',
            padding: '16px',
            color: '#713200',
        },
      });
    });

    return () => unsubscribe();
  }, [user]);

  return { permission };
}