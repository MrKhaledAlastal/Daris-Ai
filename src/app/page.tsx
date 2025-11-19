'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '@/components/layout/splash-screen';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [isPWA, setIsPWA] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWA(true);
    }
    // Redirect immediately if not in PWA mode or after a short delay if it is
    const timer = setTimeout(() => {
        router.replace('/chat');
    }, isPWA ? 2000 : 0); // 2s delay for splash screen in PWA

    return () => clearTimeout(timer);
  }, [router, isPWA]);

  // On the server or before client-side check, render a minimal loader
  if (!isClient) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  // If it's a PWA, show the splash screen, otherwise show the simple loader while redirecting.
  return isPWA ? <SplashScreen /> : (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
