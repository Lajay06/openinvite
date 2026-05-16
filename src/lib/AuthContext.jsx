import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

function clearAllAuth() {
  localStorage.removeItem('oi_auth');
  localStorage.removeItem('oi_user');
  localStorage.removeItem('base44_access_token');
  localStorage.removeItem('token');
  localStorage.removeItem('oi_couple_name');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    const token = localStorage.getItem('base44_access_token');

    if (token) {
      // Token present — validate it against Base44
      try {
        const me = await base44.auth.me();
        localStorage.setItem('oi_auth', '1');
        localStorage.setItem('oi_user', JSON.stringify(me));
        setUser(me);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch {
        // Token expired or invalid — clear everything and send to login
        clearAllAuth();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Session expired. Please sign in.' });
        // Only redirect if not already on the login page
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    } else {
      // No Base44 token — clear any stale local auth flags and remain unauthenticated
      const staleLocalAuth = localStorage.getItem('oi_auth');
      if (staleLocalAuth) {
        clearAllAuth();
      }
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Please sign in.' });
    }

    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
  };

  const logout = (shouldRedirect = true) => {
    clearAllAuth();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required', message: 'Please sign in.' });
    if (shouldRedirect) window.location.href = '/login';
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
