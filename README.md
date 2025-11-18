# 🏠 Family OS - Your Family Operating System

A fun, colorful, and comprehensive family management app built with Next.js and Firebase. Track chores, manage todos, share memories, store documents, sync calendars, and enjoy daily memes - all in one beautiful interface!

## ✨ Features

- 🎨 **Colorful, Fun UI** - Engaging design with emoji icons and playful animations
- 👥 **Multi-User Management** - Parent and child roles with permissions
- ✅ **Shared To-Dos** - Real-time task management for the whole family
- 🧹 **Chore Tracker** - Gamified chore system with points and rewards
- 📅 **Google Calendar Sync** - See all family events in one place
- 📄 **Document Vault** - Secure storage with OCR text extraction
- 📸 **Memory Vault** - Photo and video gallery with likes
- 😂 **Daily Meme** - Family-friendly meme updates every day
- 🏆 **Leaderboard** - Track points and motivate kids
- 🎭 **Fun Avatars** - Customizable avatars for each family member

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Firebase account
- Git

### 1. Clone and Install

\`\`\`bash
git clone <your-repo-url>
cd family-os
npm install
\`\`\`

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Email/Password and Google Sign-In)
   - **Firestore Database**
   - **Cloud Storage**
   - **Cloud Functions**

#### Enable Authentication

1. Go to Authentication > Sign-in method
2. Enable "Email/Password"
3. Enable "Google"
4. Add authorized domain: `localhost` (for development)

#### Create Firestore Database

1. Go to Firestore Database > Create database
2. Start in **production mode**
3. Choose a location close to your users

#### Enable Cloud Storage

1. Go to Storage > Get started
2. Start in **production mode**

### 3. Environment Variables

1. Copy the example file:
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

2. Get your Firebase config from Project Settings > General > Your apps
3. Fill in your `.env.local` file with your Firebase credentials

### 4. Deploy Security Rules

#### Firestore Rules

In Firebase Console > Firestore Database > Rules, paste the rules from the backend setup (see section below).

#### Storage Rules

In Firebase Console > Storage > Rules, paste the storage rules from the backend setup.

### 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Firebase Backend Setup

### Deploy Cloud Functions

1. Install Firebase CLI:
\`\`\`bash
npm install -g firebase-tools
firebase login
\`\`\`

2. Initialize Firebase in your project:
\`\`\`bash
firebase init
\`\`\`
Select:
- Firestore
- Functions (JavaScript)
- Storage
- Hosting (optional)

3. Copy the Cloud Functions code from the setup documentation into `functions/index.js`

4. Install function dependencies:
\`\`\`bash
cd functions
npm install @google-cloud/vision axios googleapis
cd ..
\`\`\`

5. Deploy functions:
\`\`\`bash
firebase deploy --only functions
\`\`\`

### Enable Required APIs

In Google Cloud Console for your Firebase project, enable:
- Cloud Vision API (for OCR)
- Google Calendar API (for calendar sync)

### Configure Daily Meme Scheduler

The `fetchDailyMeme` function runs automatically at 6 AM daily. No additional setup needed!

## 📁 Project Structure

\`\`\`
family-os/
├── app/                      # Next.js app directory
│   ├── page.js              # Landing/login page
│   ├── layout.js            # Root layout with providers
│   ├── dashboard/           # Dashboard page
│   ├── todos/               # To-dos page
│   ├── chores/              # Chores page
│   ├── calendar/            # Calendar page
│   ├── documents/           # Documents page
│   ├── memories/            # Memories page
│   └── setup/               # Initial setup page
├── components/              # React components
│   ├── UserAvatar.js        # Avatar display component
│   ├── DailyMeme.js         # Daily meme component
│   ├── ChoreCard.js         # Chore card with approval
│   ├── TodoItem.js          # Todo item with checkbox
│   ├── Sidebar.js           # Navigation sidebar
│   └── DashboardLayout.js   # Layout wrapper
├── contexts/                # React contexts
│   ├── AuthContext.js       # Authentication state
│   └── FamilyContext.js     # Family data state
├── hooks/                   # Custom React hooks
│   └── useFirebase.js       # Firebase data hooks
├── lib/                     # Utilities
│   ├── firebase.js          # Firebase configuration
│   └── icons.js             # Icon mappings
├── public/                  # Static assets
└── functions/               # Firebase Cloud Functions
    └── index.js             # All backend functions
\`\`\`

## 🎨 Customization

### Change Color Scheme

Edit `tailwind.config.js` to customize the color palette:

\`\`\`javascript
colors: {
  primary: { /* your colors */ },
  secondary: { /* your colors */ },
  accent: { /* your colors */ },
}
\`\`\`

### Add Custom Icons

Edit `lib/icons.js` to add more emoji combinations:

\`\`\`javascript
export const ICON_MAP = {
  'your_icon_id': '🎨✨',
  // ... more icons
};
\`\`\`

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables from `.env.local`
5. Deploy!

### Deploy to Firebase Hosting

1. Build the app:
\`\`\`bash
npm run build
\`\`\`

2. Initialize Firebase Hosting:
\`\`\`bash
firebase init hosting
\`\`\`

3. Deploy:
\`\`\`bash
firebase deploy --only hosting
\`\`\`

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Review Firestore rules** - Ensure they match your security requirements
3. **Enable App Check** - Add extra security to your Firebase backend
4. **Set up billing alerts** - Monitor Firebase usage
5. **Regular backups** - Set up automatic Firestore backups

## 🐛 Troubleshooting

### "Permission denied" errors
- Check your Firestore security rules
- Ensure user is authenticated
- Verify user has correct role (parent/child)

### Images not loading
- Check Firebase Storage rules
- Verify CORS settings in Storage
- Ensure domains are whitelisted in `next.config.js`

### Cloud Functions not working
- Check function logs in Firebase Console
- Ensure all required APIs are enabled
- Verify function has correct permissions

### Avatar images broken
- Check that DiceBear domain is in `next.config.js`
- Verify internet connection
- Try refreshing the page

## 🎯 Roadmap

- [ ] Push notifications for chore reminders
- [ ] Reward redemption system
- [ ] Family chat feature
- [ ] Meal planning calendar
- [ ] Shopping list integration
- [ ] Mobile app (React Native)
- [ ] Budget tracker
- [ ] Screen time limits

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this for your own family!

## 💬 Support

Need help? Open an issue on GitHub or reach out to the community!

---

Made with ❤️ for families everywhere
