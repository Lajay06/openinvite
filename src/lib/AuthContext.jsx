import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

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

  const checkAppState = () => {
    // localStorage-first auth — instant, no Base44 API calls
    const localAuth = localStorage.getItem('oi_auth');
    if (localAuth === '1') {
      try {
        const storedUser = JSON.parse(localStorage.getItem('oi_user') || '{}');
        setUser(storedUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch {
        localStorage.removeItem('oi_auth');
        localStorage.removeItem('oi_user');
        setAuthError({ type: 'auth_required', message: 'Session expired. Please sign in.' });
      }
    } else {
      setAuthError({ type: 'auth_required', message: 'Please sign in.' });
    }
    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
  };

  const logout = (shouldRedirect = true) => {
    localStorage.removeItem('oi_auth');
    localStorage.removeItem('oi_user');
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
