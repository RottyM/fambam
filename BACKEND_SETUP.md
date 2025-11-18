# Firebase Backend Setup Guide

This guide walks you through setting up the complete Firebase backend for Family OS.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name your project (e.g., "family-os")
4. Disable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"
5. Enable **Google**:
   - Click on "Google"
   - Toggle "Enable"
   - Select a support email
   - Click "Save"

## 3. Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode**
4. Select a location (choose closest to your users)
5. Click "Enable"

### Deploy Firestore Security Rules

In Firestore Database > Rules tab, replace the content with:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isFamilyMember(familyId) {
      return isAuthenticated() && getUserData().familyId == familyId;
    }
    
    function isParent() {
      return isAuthenticated() && getUserData().role == "parent";
    }
    
    function isParentInFamily(familyId) {
      return isFamilyMember(familyId) && isParent();
    }
    
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == userId || 
                      isFamilyMember(resource.data.familyId));
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isAuthenticated() && request.auth.uid == userId;
      allow delete: if false;
    }
    
    match /families/{familyId} {
      allow read: if isFamilyMember(familyId);
      allow create: if isAuthenticated();
      allow update: if isParentInFamily(familyId);
      allow delete: if false;
      
      match /todos/{todoId} {
        allow read: if isFamilyMember(familyId);
        allow create: if isFamilyMember(familyId);
        allow update: if isFamilyMember(familyId);
        allow delete: if isParentInFamily(familyId);
      }
      
      match /chores/{choreId} {
        allow read: if isFamilyMember(familyId);
        allow create: if isParentInFamily(familyId);
        allow update: if isFamilyMember(familyId);
        allow delete: if isParentInFamily(familyId);
      }
      
      match /transactions/{transactionId} {
        allow read: if isFamilyMember(familyId);
        allow create, update, delete: if false;
      }
      
      match /documents/{docId} {
        allow read: if isFamilyMember(familyId);
        allow create: if isFamilyMember(familyId);
        allow update: if isFamilyMember(familyId);
        allow delete: if isParentInFamily(familyId);
      }
      
      match /memories/{memoryId} {
        allow read: if isFamilyMember(familyId);
        allow create: if isFamilyMember(familyId);
        allow update: if isFamilyMember(familyId);
        allow delete: if isParentInFamily(familyId) || 
                         resource.data.uploadedBy == request.auth.uid;
      }
      
      match /calendar-events/{eventId} {
        allow read: if isFamilyMember(familyId);
        allow write: if false;
      }
    }
    
    match /app-config/{doc} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
  }
}
\`\`\`

Click **Publish** to deploy the rules.

## 4. Enable Cloud Storage

1. Go to **Storage**
2. Click "Get started"
3. Choose **Start in production mode**
4. Use default location
5. Click "Done"

### Deploy Storage Security Rules

In Storage > Rules tab, replace the content with:

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data;
    }
    
    function isFamilyMember(familyId) {
      return isAuthenticated() && getUserData().familyId == familyId;
    }
    
    match /families/{familyId}/documents/{docId} {
      allow read: if isFamilyMember(familyId);
      allow write: if isFamilyMember(familyId) && 
                      request.resource.size < 10 * 1024 * 1024;
    }
    
    match /families/{familyId}/memories/{allPaths=**} {
      allow read: if isFamilyMember(familyId);
      allow write: if isFamilyMember(familyId) && 
                      request.resource.size < 50 * 1024 * 1024;
    }
    
    match /avatars/{userId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && 
                      request.auth.uid == userId &&
                      request.resource.size < 2 * 1024 * 1024;
    }
  }
}
\`\`\`

Click **Publish** to deploy the rules.

## 5. Set up Cloud Functions

### Install Firebase CLI

\`\`\`bash
npm install -g firebase-tools
firebase login
\`\`\`

### Initialize Firebase in Your Project

\`\`\`bash
cd family-os
firebase init
\`\`\`

Select:
- **Firestore** (press Space to select)
- **Functions** (press Space to select)
- **Storage** (press Space to select)
- Press Enter

Follow prompts:
- Use an existing project: Select your project
- Firestore rules: Keep default (firestore.rules)
- Firestore indexes: Keep default (firestore.indexes.json)
- Language: JavaScript
- ESLint: No (or Yes, up to you)
- Install dependencies: Yes
- Storage rules: Keep default (storage.rules)

### Add Cloud Function Dependencies

\`\`\`bash
cd functions
npm install @google-cloud/vision axios googleapis
cd ..
\`\`\`

### Deploy Cloud Functions

The Cloud Functions code is provided in the main setup documentation. Copy it to `functions/index.js`, then:

\`\`\`bash
firebase deploy --only functions
\`\`\`

## 6. Enable Required Google Cloud APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** > **Library**
4. Search for and enable:
   - **Cloud Vision API** (for OCR)
   - **Google Calendar API** (for calendar sync)

## 7. Configure OAuth for Google Calendar

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - Your production domain
5. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - Your production domain
6. Click **Create**
7. Note the Client ID (you'll need this for calendar sync)

## 8. Get Firebase Config for Frontend

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click the web icon (</>)
4. Register your app
5. Copy the config object
6. Paste values into your `.env.local` file

## 9. Test Your Setup

1. Start your Next.js app:
\`\`\`bash
npm run dev
\`\`\`

2. Open http://localhost:3000
3. Sign up with email or Google
4. Try creating a family
5. Upload a document to test OCR
6. Add a todo or chore

## 10. Deploy to Production

### Option A: Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Option B: Deploy to Firebase Hosting

\`\`\`bash
npm run build
firebase deploy --only hosting
\`\`\`

## Troubleshooting

### "Permission denied" in Firestore
- Double-check security rules are published
- Verify user is authenticated
- Check user document has familyId field

### Cloud Functions not deploying
- Ensure Firebase CLI is up to date: \`npm install -g firebase-tools@latest\`
- Check functions/package.json has correct dependencies
- View deployment logs: \`firebase functions:log\`

### Storage uploads failing
- Verify Storage rules are published
- Check file size limits
- Ensure user is authenticated

### Daily meme not appearing
- Check if \`fetchDailyMeme\` function deployed successfully
- Manually trigger it: \`firebase functions:call fetchDailyMeme\`
- Check Firestore for \`app-config/daily-meme\` document

## Costs & Limits

Firebase has a generous free tier (Spark plan):
- 50k reads/day in Firestore
- 20k writes/day in Firestore
- 5GB storage
- 1GB/day bandwidth
- 2M Cloud Function invocations/month

For most families, this is more than enough! Upgrade to Blaze (pay-as-you-go) if needed.

## Next Steps

- Add more family members
- Customize the color scheme
- Add custom chore icons
- Set up calendar sync
- Enable push notifications (future feature)

---

Need help? Check the main README or open an issue on GitHub!
