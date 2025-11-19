'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
    const { t, lang, setLanguage } = useLanguage();
    const { isLoggedIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isLoggedIn) {
            router.push('/login?redirect=/settings');
        }
    }, [isLoggedIn, loading, router]);

    if (loading || !isLoggedIn) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-primary">{t.settings}</h1>
            <p className="mt-2 text-muted-foreground">
                Manage your application settings.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>{t.language}</CardTitle>
                        <CardDescription>Choose your preferred language.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup 
                            value={lang} 
                            onValueChange={(value) => setLanguage(value as 'en' | 'ar')}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="en" id="en" className="peer sr-only" />
                                <Label
                                htmlFor="en"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                {t.english}
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="ar" id="ar" className="peer sr-only" />
                                <Label
                                htmlFor="ar"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                {t.arabic}
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
