// import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { FamilyProvider } from '@/contexts/FamilyContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import ClientLayout from '@/components/ClientLayout';

// Temporarily disabled Google Fonts due to network constraints during build
// const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
// const poppins = Poppins({
//   weight: ['400', '600', '700', '800'],
//   subsets: ['latin'],
//   variable: '--font-poppins'
// });

export const metadata = {
  title: 'Family OS - Your Family Operating System',
  description: 'Manage your family life with style!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Family OS',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#ed3f8e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="Family OS" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Family OS" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#ed3f8e" />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <AuthProvider>
            <FamilyProvider>
              <NotificationProvider>
                <ClientLayout>
                  {children}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 3000,
                      style: {
                        background: '#fff',
                        color: '#363636',
                        fontWeight: '600',
                        borderRadius: '12px',
                        padding: '16px',
                      },
                      success: {
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                </ClientLayout>
              </NotificationProvider>
            </FamilyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
