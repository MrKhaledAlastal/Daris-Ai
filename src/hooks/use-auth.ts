import { useContext } from 'react';
import { AuthContext } from '@/contexts/auth-provider';

export function useAuth() {
  return useContext(AuthContext);
}
