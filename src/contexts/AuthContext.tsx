import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseAvailable } from '@/integrations/supabase/client';
import type { User, Session, Provider } from '@supabase/supabase-js';
import { UserProfile } from '@/services/followService';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null, session: Session | null } | undefined>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ user: User | null, session: Session | null } | undefined>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<{ user: User | null, session: Session | null } | undefined>;
  signInWithOAuth: (provider: Provider) => Promise<{ provider: Provider; url: string | null }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supabaseAvailable, setSupabaseAvailable] = useState(true);

  // Check if Supabase is available
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      const available = await isSupabaseAvailable();
      setSupabaseAvailable(available);

      if (!available) {
        console.error('Supabase connection is not available');
        toast({
          title: 'Connection Issue',
          description: 'Unable to connect to the database. Some features may be limited.',
          variant: 'destructive'
        });
      }
    };

    checkSupabaseConnection();
  }, []);

  // Fetch user profile data with improved error handling
  const fetchProfile = async (userId: string) => {
    if (!supabaseAvailable) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Check for session on mount with improved handling
  useEffect(() => {
    const checkUser = async () => {
      if (!supabaseAvailable) {
        setLoading(false);
        return;
      }

      try {
        // Get current session and user
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: userData } = await supabase.auth.getUser();

        const currentUser = userData.user;
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);

        if (currentUser) {
          const profileData = await fetchProfile(currentUser.id);
          setProfile(profileData);

          // Check if session is about to expire and refresh if needed
          const session = sessionData.session;
          if (session) {
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);
            const timeToExpire = expiresAt - now;

            // If session expires in less than 1 hour (3600 seconds), refresh it
            if (timeToExpire < 3600) {
              console.log('Session about to expire, refreshing...');
              await refreshSession();
            }
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for auth state changes with improved handling
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      const currentUser = session?.user || null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);

      if (currentUser) {
        const profileData = await fetchProfile(currentUser.id);
        setProfile(profileData);

        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in successfully');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed');
        }
      } else {
        setProfile(null);

        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseAvailable]);

  // Sign in with email and password - with improved error handling
  const signIn = async (email: string, password: string) => {
    if (!supabaseAvailable) {
      throw new AuthError('Authentication service unavailable. Please try again later.', 503);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Authentication error:', error.message);

        // Provide more user-friendly error messages based on error code
        let userMessage = 'Failed to sign in. Please try again.';
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please confirm your email address before signing in.';
        }

        throw new AuthError(userMessage, error.status);
      }

      return data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error signing in:', {
        message: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString()
      });

      // Rethrow with user-friendly message
      throw new AuthError(
        error.message || 'Failed to sign in. Please try again.',
        error.status
      );
    }
  };

  // Sign up with email and password - with improved validation and error handling
  const signUp = async (email: string, password: string, userData?: any) => {
    if (!supabaseAvailable) {
      throw new AuthError('Authentication service unavailable. Please try again later.', 503);
    }

    // Basic validation
    if (!email || !email.includes('@')) {
      throw new AuthError('Please enter a valid email address.', 400);
    }

    if (!password || password.length < 6) {
      throw new AuthError('Password must be at least 6 characters long.', 400);
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) {
        console.error('Authentication error:', error.message);

        // Provide more user-friendly error messages based on error code
        let userMessage = 'Failed to create account. Please try again.';
        if (error.message.includes('already registered')) {
          userMessage = 'This email is already registered. Please sign in instead.';
        }

        throw new AuthError(userMessage, error.status);
      }

      // Check if email confirmation is required
      if (data?.user && !data.user.confirmed_at) {
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your email to confirm your account.',
        });
      }

      return data;
    } catch (error: any) {
      // Log detailed error information
      console.error('Error signing up:', {
        message: error.message,
        code: error.code,
        status: error.status,
        timestamp: new Date().toISOString()
      });

      // Rethrow with user-friendly message
      throw new AuthError(
        error.message || 'Failed to create account. Please try again.',
        error.status
      );
    }
  };

  // Sign out with improved error handling
  const signOut = async () => {
    if (!supabaseAvailable) {
      toast({
        title: 'Error',
        description: 'Authentication service unavailable. Please try again later.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        toast({
          title: 'Sign Out Error',
          description: 'There was a problem signing out. Please try again.',
          variant: 'destructive'
        });
      } else {
        // Clear local state
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Sign Out Error',
        description: 'There was a problem signing out. Please try again.',
        variant: 'destructive'
      });
    }
  };
  // Implement token refresh logic with improved handling
  const refreshSession = async () => {
    if (!supabaseAvailable) {
      throw new AuthError('Authentication service unavailable. Please try again later.', 503);
    }

    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Session refresh error:', error.message);
        throw new AuthError(error.message, error.status);
      }

      return data;
    } catch (error: any) {
      console.error('Error refreshing session:', error);

      // Handle session expiration
      if (error.status === 401) {
        // Clear local session
        await supabase.auth.signOut();
        // Redirect to login
        window.location.href = '/login';
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please sign in again.',
          variant: 'destructive'
        });
      }

      throw error;
    }
  };

  // Sign in with OAuth provider
  const signInWithOAuth = async (provider: Provider) => {
    if (!supabaseAvailable) {
      throw new AuthError('Authentication service unavailable. Please try again later.', 503);
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      });

      if (error) {
        console.error(`OAuth sign in error (${provider}):`, error.message);
        throw new AuthError(error.message, error.status);
      }

      return data;
    } catch (error: any) {
      console.error(`OAuth sign in error (${provider}):`, error);
      throw new AuthError(
        error.message || `Failed to sign in with ${provider}. Please try again.`,
        error.status
      );
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    if (!supabaseAvailable) {
      throw new AuthError('Authentication service unavailable. Please try again later.', 503);
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      });

      if (error) {
        console.error('Reset password error:', error.message);
        throw new AuthError(error.message, error.status);
      }

      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for a link to reset your password.',
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw new AuthError(
        error.message || 'Failed to send password reset email. Please try again.',
        error.status
      );
    }
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    if (!supabaseAvailable) {
      throw new AuthError('Authentication service unavailable. Please try again later.', 503);
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Update password error:', error.message);
        throw new AuthError(error.message, error.status);
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      throw new AuthError(
        error.message || 'Failed to update password. Please try again.',
        error.status
      );
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshSession,
    signInWithOAuth,
    resetPassword,
    updatePassword,
    isAuthenticated
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
class AuthError extends Error {
  status?: number; // Declare the status property
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}
