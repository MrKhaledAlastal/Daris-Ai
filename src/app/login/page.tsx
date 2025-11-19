'use client';

import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="absolute top-8 left-1/2 -translate-x-1/2">
          <Logo className="h-10 w-auto text-primary" />
        </div>
      <Card className="w-full max-w-md glass-card">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {t.login}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {t.dontHaveAccount}{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          {t.register}
        </Link>
      </p>
    </main>
  );
}
