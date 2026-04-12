import { create } from 'zustand';
import { User } from '@/types';
import { getCurrentUser, isAuthenticated } from '@/lib/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

// Rehydrate state from cookies on initialization
// Only run on client-side to prevent hydration mismatch
const persistedUser = typeof window !== 'undefined' ? getCurrentUser() : null;
const persistedAuth = typeof window !== 'undefined' ? isAuthenticated() : false;

export const useAuthStore = create<AuthState>((set) => ({
  user: persistedUser,
  isAuthenticated: persistedAuth,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
