import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const createUserProfile = useCallback(async (user) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if ((error && error.code === 'PGRST116') || !data) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
            avatar_url: user.user_metadata?.avatar_url
          }]);

        if (insertError && insertError.code !== '23505') {
          console.error('Error creating user profile:', insertError);
        }
      }
    } catch (err) {
      console.error('Error handling user profile:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authListener = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...', { attempt: retryCount + 1 });
        
        // Get current session with retry logic
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          
          // Retry logic for network issues
          if (retryCount < maxRetries && (error.message.includes('network') || error.message.includes('timeout'))) {
            retryCount++;
            console.log(`🔄 Retrying auth initialization (${retryCount}/${maxRetries})...`);
            setTimeout(initializeAuth, 1000 * retryCount);
            return;
          }
          
          if (isMounted) {
            setError(error.message);
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (!isMounted) return;

        // Set auth state atomically
        console.log('✅ Setting auth state:', session ? 'authenticated' : 'not authenticated');
        
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);
        
        // Create profile if needed
        if (session?.user) {
          console.log('👤 Creating user profile...');
          await createUserProfile(session.user);
        }
        
        // Mark as initialized and stop loading
        setInitialized(true);
        setLoading(false);
        console.log('🏁 Auth initialization complete');

        // Set up auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          console.log('🔔 Auth state change:', event);
          
          if (!isMounted) return;
          
          // Handle different auth events
          switch (event) {
            case 'SIGNED_IN':
              setSession(newSession);
              setUser(newSession?.user ?? null);
              setError(null);
              if (newSession?.user) {
                await createUserProfile(newSession.user);
              }
              break;
              
            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setError(null);
              break;
              
            case 'TOKEN_REFRESHED':
              setSession(newSession);
              setUser(newSession?.user ?? null);
              break;
              
            default:
              setSession(newSession);
              setUser(newSession?.user ?? null);
          }
        });
        
        authListener = subscription;

      } catch (err) {
        console.error('💥 Auth initialization error:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      console.log('🧹 Cleaning up auth...');
      isMounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [createUserProfile]);

  const signOut = async () => {
    try {
      setError(null);
      console.log('👋 Signing out...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ Sign out successful');
    } catch (err) {
      setError(err.message);
      console.error('❌ Error signing out:', err);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      console.log('🔐 Initiating Google sign-in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      console.error('❌ Error signing in with Google:', err);
      throw err;
    }
  };

  const clearError = () => setError(null);

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 useAuth state:', { 
      loading, 
      initialized,
      hasUser: !!user, 
      hasSession: !!session,
      userId: user?.id 
    });
  }

  return {
    user,
    session,
    loading,
    initialized,
    error,
    isAuthenticated: !!user && !!session,
    signOut,
    signInWithGoogle,
    clearError
  };
}
