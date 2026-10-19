import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, OnboardingAnswers } from '../types.ts';
import {
  fetchCurrentUser,
  login as apiLogin,
  loginDemo as apiLoginDemo,
  loginWithFirebase as apiLoginWithFirebase,
  signup as apiSignup,
  logout as apiLogout,
  submitOnboarding as apiSubmitOnboarding,
  getStoredToken,
  getStoredUser,
  setStoredUser,
  clearStoredSession,
  onAuthStateChange,
} from '../services/api.ts';
import { auth } from '../lib/firebase.ts';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<User>;
  loginDemo: () => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  signup: (email: string, pass: string) => Promise<User>;
  saveOnboarding: (answers: OnboardingAnswers) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (user: User | null) => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize from persistent localStorage so user is immediately signed in
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  // Loading is only true if we have a token but haven't loaded the user profile yet
  const [loading, setLoading] = useState<boolean>(() => !getStoredUser() && Boolean(getStoredToken()));

  // 1. Subscribe to live auth state change events (pub/sub listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChange((newUser, newToken) => {
      console.log('[AUTH CONTEXT] Reactive onAuthStateChange triggered:', newUser?.email);
      setUser(newUser);
      setToken(newToken);
    });

    return unsubscribe;
  }, []);

  // 2. Cross-tab & multi-window synchronization via native storage event
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'flaw_auth_token' || event.key === 'flaw_auth_user') {
        const freshUser = getStoredUser();
        const freshToken = getStoredToken();
        console.log('[AUTH CONTEXT] Cross-tab storage change detected. Active user:', freshUser?.email);
        setUser(freshUser);
        setToken(freshToken);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 3. Initial load & background re-verification with server
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        console.log('[AUTH CONTEXT] Checking persistent session on mount...');
        const currentUser = await fetchCurrentUser();
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser);
            setToken(storedToken);
          } else {
            setUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.warn('[AUTH CONTEXT] Session verification note:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    const handleAuthExpired = () => {
      console.log('[AUTH CONTEXT] Received auth:expired event, clearing context.');
      if (isMounted) {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await apiLogin(email, pass);
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = async (): Promise<User> => {
    setLoading(true);
    try {
      const res = await apiLoginDemo();
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
      // This will redirect, so no return value here
      return {} as User; 
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Handle redirect result on component mount
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          const res = await apiLoginWithFirebase({
            email: user.email!,
            firebaseUid: user.uid,
            name: user.displayName || undefined,
            idToken: await user.getIdToken(),
          });
          setUser(res.user);
          setToken(res.token);
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      } finally {
        setLoading(false);
      }
    };
    handleRedirectResult();
  }, []);

  const signup = async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await apiSignup(email, pass);
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const saveOnboarding = async (answers: OnboardingAnswers): Promise<User> => {
    setLoading(true);
    try {
      const res = await apiSubmitOnboarding(answers);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setToken(null);
      setLoading(false);
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    try {
      const refreshed = await fetchCurrentUser();
      setUser(refreshed);
      return refreshed;
    } catch {
      return null;
    }
  };

  const updateUser = useCallback((updated: User | null) => {
    setUser(updated);
    setStoredUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user),
        login,
        loginDemo,
        loginWithGoogle,
        signup,
        saveOnboarding,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
