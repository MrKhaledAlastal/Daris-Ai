import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { onAuthStateChange } from "@/lib/supabase-auth";

export function useAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChange(async (user) => {
            if (user?.id) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    
                    if (error) throw error;
                    setIsAdmin(data?.role === 'admin');
                } catch (error) {
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }

            setChecking(false);
        });

        return () => unsubscribe?.();
    }, []);

    return { isAdmin, checking };
}
