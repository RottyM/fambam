import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { FamilyProvider } from '@/contexts/FamilyContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ 
  weight: ['400', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins'
});

export const metadata = {
  title: 'Family OS - Your Family Operating System',
  description: 'Manage your family life with style!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} font-sans`}>
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
