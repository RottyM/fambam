'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext({});

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [permission, setPermission] = useState('default');
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { user, userData } = useAuth();

  // Request notification permission and get FCM token
  const requestPermission = async () => {
    try {
      // First, ensure service worker is registered
      if ('serviceWorker' in navigator) {
        try {
          // Unregister any existing service workers first to avoid conflicts
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            if (registration.active && !registration.active.scriptURL.includes('firebase-messaging-sw.js')) {
              await registration.unregister();
              console.log('Unregistered old service worker:', registration.active.scriptURL);
            }
          }

          // Register Firebase messaging service worker
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });

          // Wait for the service worker to be ready
          await navigator.serviceWorker.ready;

          if (process.env.NODE_ENV === 'development') {
            console.log('Firebase Messaging Service Worker registered successfully');
          }
        } catch (swError) {
          console.error('Service Worker registration failed:', swError);
          toast.error('Failed to register service worker for notifications');
          return;
        }
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted' && user) {
        // Validate VAPID key exists
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error('VAPID key is missing');
          toast.error('Notification configuration error. Please contact support.');
          return;
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('VAPID key configured:', vapidKey.length === 87 ? 'Valid length' : 'Invalid length');
        }

        // Get FCM token with service worker registration
        const messaging = getMessaging();
        const swRegistration = await navigator.serviceWorker.ready;

        try {
          const token = await getToken(messaging, {
            vapidKey: vapidKey,
            serviceWorkerRegistration: swRegistration,
          });

          if (token) {
            console.log('FCM token obtained successfully');

            // Save token to user document FIRST
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
              fcmToken: token,
              notificationsEnabled: true,
              updatedAt: new Date(),
            });

            // Only update state after successful save
            setFcmToken(token);
            setNotificationsEnabled(true);
            toast.success('Notifications enabled! 🔔');
          } else {
            console.error('No token received from Firebase');
            setNotificationsEnabled(false);
            toast.error('Failed to get notification token');
          }
        } catch (tokenError) {
          console.error('Error getting FCM token:', tokenError);

          if (process.env.NODE_ENV === 'development') {
            console.error('Error details:', {
              name: tokenError.name,
              message: tokenError.message,
              code: tokenError.code,
            });
            console.error('Debug info:', {
              hasServiceWorker: 'serviceWorker' in navigator,
              notificationPermission: Notification.permission,
              vapidKeyValid: vapidKey?.length === 87,
            });
          }

          // Reset state on error
          setNotificationsEnabled(false);
          setFcmToken(null);

          if (tokenError.message.includes('applicationServerKey') || tokenError.message.includes('VAPID')) {
            toast.error('Invalid VAPID key. Please check Firebase configuration.');
          } else if (tokenError.message.includes('messaging/permission')) {
            toast.error('Notification permission was denied.');
          } else {
            toast.error(`Notification setup failed: ${tokenError.message}`);
          }

          // Don't re-throw - we've handled the error
          return;
        }
      } else if (permissionResult === 'denied') {
        toast.error('Notification permission denied. Please enable in browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      if (!error.message.includes('VAPID')) {
        toast.error('Failed to enable notifications');
      }
    }
  };

  // Disable notifications
  const disableNotifications = async () => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcmToken: null,
          notificationsEnabled: false,
          updatedAt: new Date(),
        });

        setFcmToken(null);
        setNotificationsEnabled(false);
        toast.success('Notifications disabled');
      } catch (error) {
        console.error('Error disabling notifications:', error);
        toast.error('Failed to disable notifications');
      }
    }
  };

  // Force reset notification state (for debugging)
  const resetNotificationState = async () => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcmToken: null,
          notificationsEnabled: false,
          updatedAt: new Date(),
        });

        setFcmToken(null);
        setNotificationsEnabled(false);
        setPermission('default');

        if (process.env.NODE_ENV === 'development') {
          console.log('Notification state reset successfully');
        }
        toast.success('Notification state reset - try enabling again');
      } catch (error) {
        console.error('Error resetting notification state:', error);
        toast.error('Failed to reset notification state');
      }
    }
  };

  // Sync notification state from userData
  useEffect(() => {
    if (userData) {
      setNotificationsEnabled(userData.notificationsEnabled || false);
      setFcmToken(userData.fcmToken || null);
    }
  }, [userData]);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !notificationsEnabled) {
      // Only register if notifications are not already enabled (to avoid duplicate registrations)
      navigator.serviceWorker.getRegistration('/').then((registration) => {
        if (!registration) {
          navigator.serviceWorker
            .register('/firebase-messaging-sw.js', { scope: '/' })
            .then((registration) => {
              if (process.env.NODE_ENV === 'development') {
                console.log('Service Worker pre-registered for faster notification setup');
              }
            })
            .catch((error) => {
              console.error('Service Worker pre-registration failed:', error);
            });
        }
      });
    }
  }, [notificationsEnabled]);

  // Listen for foreground messages
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging();

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground notification received:', payload);

        // Show toast notification
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <span className="text-2xl">{payload.notification?.icon || '🔔'}</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {payload.notification?.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {payload.notification?.body}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), {
          duration: 6000,
        });
      });

      return unsubscribe;
    }
  }, []);

  // Check current permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const value = {
    permission,
    fcmToken,
    notificationsEnabled,
    requestPermission,
    disableNotifications,
    resetNotificationState,
    notificationsSupported: typeof window !== 'undefined' && 'Notification' in window,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
