# 🔔 Push Notifications Setup Guide

This guide will help you set up push notifications for your Family OS app.

## What Gets Notified

- ✅ **Chore Assignments**: When a chore is assigned or reassigned to you
- ✅ **Chore Approvals**: When your completed chore is approved
- ✅ **To-Do Assignments**: When a to-do is assigned or reassigned to you
- 📅 **Calendar Reminders**: 1 hour before calendar events start

## Step 1: Enable Firebase Cloud Messaging

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the ⚙️ gear icon → **Project settings**
4. Go to the **Cloud Messaging** tab
5. You should see your **Server key** and **Sender ID** (you already have these)

## Step 2: Get Your VAPID Key

The VAPID key is required for web push notifications:

1. In Firebase Console → Project Settings → **Cloud Messaging** tab
2. Scroll down to **Web Push certificates**
3. Click **Generate key pair** (if you don't have one)
4. Copy the **Key pair** value (starts with `B...`)

## Step 3: Add Environment Variables

Add these to your `.env.local` file:

```bash
# Your existing Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Add this NEW variable:
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key_from_step_2
```

## Step 4: Configure Service Worker

Update `/public/firebase-messaging-sw.js` with your Firebase config:

1. Open `public/firebase-messaging-sw.js`
2. Replace the placeholder values with your actual Firebase config:

```javascript
firebase.initializeApp({
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
});
```

⚠️ **Important**: Use the actual values, NOT the `NEXT_PUBLIC_*` environment variable names. Service workers can't access environment variables.

## Step 5: Deploy Firebase Functions

The notification triggers are Firebase Cloud Functions that need to be deployed:

```bash
# Navigate to functions directory
cd functions

# Install dependencies (if not already done)
npm install

# Deploy all functions
firebase deploy --only functions

# Or deploy specific notification functions:
firebase deploy --only functions:onChoreAssigned,functions:onChoreUpdated,functions:onTodoAssigned,functions:onTodoUpdated,functions:sendCalendarReminders
```

## Step 6: Test Notifications

### Enable Notifications in the App

1. Deploy your app with the changes
2. Log in to your app
3. Look for the 🔔 bell icon in the sidebar bottom tools
4. Click it to enable notifications
5. Accept the browser permission prompt

### Test Chore Notifications

1. Have a parent create and assign a chore to a family member
2. The assigned person should receive a push notification
3. Complete the chore and have a parent approve it
4. You should receive an approval notification with points earned

### Test To-Do Notifications

1. Create a to-do and assign it to someone
2. They should receive a notification

### Test Calendar Notifications

1. Create a calendar event that starts within the next hour
2. Wait for the hourly cron job to run (or test manually)
3. All family members should receive a reminder 1 hour before the event

## Troubleshooting

### "Notifications not supported"
- Make sure you're using HTTPS (required for notifications)
- Check that your browser supports notifications (most modern browsers do)
- Try a different browser

### "Permission denied"
- User must manually click the bell icon to grant permission
- Check browser settings to ensure notifications aren't blocked for your site
- In Chrome: Settings → Privacy and Security → Site Settings → Notifications

### "No notification received"
1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```
2. Verify the FCM token was saved to the user document in Firestore
3. Check that `notificationsEnabled` is `true` in the user document
4. Make sure the Firebase Functions are deployed and running

### "Service worker not loading"
1. Make sure `firebase-messaging-sw.js` is in the `/public` directory
2. The service worker must be served from the root of your domain
3. Check browser console for service worker errors
4. Try unregistering and re-registering the service worker:
   - Chrome DevTools → Application → Service Workers → Unregister

### Calendar reminders not working
- The scheduler runs every hour at the top of the hour
- Make sure the `sendCalendarReminders` function is deployed
- Check that calendar events have a valid `start` field in ISO format
- Verify the event hasn't already had `reminderSent: true` set

## Vercel Deployment Notes

When deploying to Vercel:

1. Add the `NEXT_PUBLIC_FIREBASE_VAPID_KEY` environment variable in Vercel:
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add the variable for Production, Preview, and Development

2. Make sure to update the service worker file with actual values (not env vars)

3. Redeploy after adding environment variables

## Security Notes

- FCM tokens are stored securely in Firestore
- Users can disable notifications at any time
- Notification permissions are per-device
- Tokens are automatically updated if they expire

## Cost Considerations

Firebase Cloud Messaging is free for the first 10,000 notifications per day per project. After that:
- $0.50 per million notifications

The calendar reminder scheduler runs every hour (720 times per month), which is well within the Firebase free tier for Cloud Functions.

## Next Steps

Once notifications are working, you can:
- Customize notification messages in `functions/src/index.ts`
- Add more notification triggers (e.g., new documents, new memories)
- Implement notification preferences (e.g., only calendar, only chores)
- Add notification sounds and vibration patterns

---

Need help? Check the Firebase console logs or open an issue!
