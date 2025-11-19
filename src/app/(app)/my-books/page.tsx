'use client';

import BookList from '@/components/books/book-list';
import BookUpload from '@/components/books/book-upload';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyBooksPage() {
    const { t } = useLanguage();
    const { isLoggedIn, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isLoggedIn) {
            router.push('/login?redirect=/my-books');
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary">{t.myBooks}</h1>
                    <p className="mt-2 text-muted-foreground">
                        {t.myBooksDescription}
                    </p>
                </div>
                <BookUpload />
            </div>
            <BookList />
        </div>
    );
}
