import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { loginWithGoogle as apiLoginWithGoogle } from '../services/api.ts';
import AuthSectionOne, { GoogleAuthPayload } from '../components/ui/auth-section-1.tsx';
import { ErrorBoundary } from '../components/ErrorBoundary.tsx';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onNavigate: (path: string) => void;
  redirectPath?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onNavigate,
  redirectPath = '/flaw/submit',
}) => {
  const { login, signup, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === 'login';

  const handleLoginSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    if (!data.email.trim() || !data.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!data.password || data.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH PAGE] Signing in user:', data.email);
      const loggedUser = await login(data.email, data.password);
      const destination = loggedUser?.onboarding_completed ? redirectPath : '/flaw/onboarding';
      console.log('[AUTH PAGE] Login successful, redirecting to:', destination);
      onNavigate(destination);
    } catch (err: any) {
      console.warn('[AUTH PAGE] Login attempt failed:', err.message);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => {
    setError(null);
    if (!data.email.trim() || !data.email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!data.password || data.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH PAGE] Registering user:', data.email);
      await signup(data.email, data.password);
      console.log('[AUTH PAGE] Signup successful, redirecting to: /flaw/onboarding');
      onNavigate('/flaw/onboarding');
    } catch (err: any) {
      console.warn('[AUTH PAGE] Signup attempt failed:', err.message);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (googleData: GoogleAuthPayload) => {
    setError(null);
    setLoading(true);
    try {
      console.log('[AUTH PAGE] Authorizing with Google:', googleData.email);
      const res = await apiLoginWithGoogle(googleData);
      const destination = res.user?.onboarding_completed ? redirectPath : '/flaw/onboarding';
      console.log('[AUTH PAGE] Google auth successful, redirecting to:', destination);
      onNavigate(destination);
    } catch (err: any) {
      console.warn('[AUTH PAGE] Google auth attempt failed:', err.message);
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary fallbackTitle={isLogin ? 'Sign In Error' : 'Sign Up Error'}>
      <AuthSectionOne
        mode={mode}
        onLogin={handleLoginSubmit}
        onSignUp={handleSignUpSubmit}
        onGoogleAuth={handleGoogleAuth}
        onGoogleSignUp={handleGoogleAuth}
        onNavigateToLogin={() => onNavigate('/flaw/login')}
        onNavigateToSignUp={() => onNavigate('/flaw/signup')}
        onNavigate={onNavigate}
        errorMessage={error}
        isLoading={loading}
      />
    </ErrorBoundary>
  );
};
