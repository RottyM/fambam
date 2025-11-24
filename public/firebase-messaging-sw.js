// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values will be replaced at build time or should match your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAKLZYNF6sxQSp8i3iLY_KvCc3bVPXEuZo",
  authDomain: "family-os-ae80f.firebaseapp.com",
  projectId: "family-os-ae80f",
  storageBucket: "family-os-ae80f.firebasestorage.app",
  messagingSenderId: "913782982866",
  appId: "1:913782982866:web:6e6c5e464e6fb46b0b98e6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Family OS Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.data?.type || 'notification',
    data: {
      url: payload.data?.url || payload.fcmOptions?.link || '/dashboard',
      ...payload.data,
    },
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  // Add "Mark as Taken" action for medication reminders
  if (payload.data?.type === 'med_reminder') {
    notificationOptions.actions = [
      {
        action: 'mark_medication_taken',
        title: 'Mark as Taken',
        icon: '/check-icon.png', // You might need to create this icon
      },
    ];
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Check if a specific action button was clicked
  if (event.action === 'mark_medication_taken') {
    const { medicationId, time, assignedTo } = event.notification.data;
    if (medicationId && time && assignedTo) {
      // Make an API call to mark the medication as taken
      // Assuming a new API route will be created: /api/medication/mark-taken
      event.waitUntil(
        fetch('/api/medication/mark-taken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ medicationId, scheduledTime: time, userId: assignedTo }),
        })
        .then(response => {
          if (!response.ok) {
            console.error('Failed to mark medication as taken via API:', response.statusText);
            // Optionally show a new notification to the user about the failure
            self.registration.showNotification('Error', {
              body: 'Failed to mark medication as taken. Please try again from the app.',
              icon: '/icon-192x192.png',
            });
          } else {
            console.log('Medication marked as taken via API successfully.');
            // Optionally show a new notification to the user about the success
            self.registration.showNotification('Medication Taken', {
              body: 'Your medication has been marked as taken!',
              icon: '/icon-192x192.png',
            });
          }
        })
        .catch(error => {
          console.error('Network error marking medication as taken:', error);
          self.registration.showNotification('Network Error', {
            body: 'Could not connect to server. Please check your internet connection.',
            icon: '/icon-192x192.png',
          });
        })
      );
    } else {
      console.warn('Missing medicationId, time, or assignedTo in notification data for mark_medication_taken action.');
    }
  } else {
    // Default behavior for other notification clicks (e.g., clicking the notification body)
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});
