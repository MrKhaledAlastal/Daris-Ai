'use client';

import type { ReactNode } from 'react';
import { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import SplashScreen from '@/components/layout/splash-screen';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoggedIn: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show a global loader only during the initial auth state check
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
