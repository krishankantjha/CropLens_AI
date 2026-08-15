import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { fetchMeApi } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('croplens_jwt') || null);
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem('croplens_jwt'));
  const [activeMode, setActiveMode] = useState('farmer');

  // Tracking ref to prevent double validation in React StrictMode
  const isValidatingRef = useRef(false);

  const validateSession = useCallback(async (jwtToken) => {
    if (!jwtToken) {
      setUser(null);
      setAuthLoading(false);
      return;
    }

    // Handle Demo Token or Google OAuth Token
    if (jwtToken.startsWith('demo_jwt_token') || jwtToken.startsWith('google_oauth_')) {
      const storedUser = localStorage.getItem('croplens_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setActiveMode(parsed.role || 'farmer');
        } catch (e) {
          console.error("Failed to parse stored OAuth user", e);
        }
      }
      setAuthLoading(false);
      return;
    }

    // Validate Real JWT against /api/v1/auth/me
    if (isValidatingRef.current) return;
    isValidatingRef.current = true;
    setAuthLoading(true);

    try {
      const userData = await fetchMeApi();
      setUser(userData);
      setActiveMode(userData.role || 'farmer');
      localStorage.setItem('croplens_user', JSON.stringify(userData));
    } catch (err) {
      console.warn("JWT Session Validation Error:", err);
      
      const status = err.response?.status;
      // If Token is 401 Unauthorized or 403 Forbidden: Expired, malformed, or revoked
      if (status === 401 || status === 403) {
        console.warn("JWT access token expired or invalid. Clearing session.");
        logout();
      } else {
        // Network Error / Server Down: Preserve token, hydrate cached profile
        const storedUser = localStorage.getItem('croplens_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setActiveMode(parsed.role || 'farmer');
          } catch (e) {
            console.error("Error parsing offline user profile:", e);
          }
        }
      }
    } finally {
      isValidatingRef.current = false;
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    validateSession(token);
  }, [token, validateSession]);

  const loginWithDemo = (role) => {
    const demoUser = role === 'farmer' 
      ? { id: 1, full_name: "Demo Farmer", mobile_number: "9876543210", role: "farmer", home_mandi: "Agra", preferred_commodity: "Potato", language: "hi" }
      : { id: 2, full_name: "Anil Sharma", mobile_number: "9811223344", role: "trader", home_mandi: "Azadpur", preferred_commodity: "Tomato", language: "en" };

    const mockToken = `demo_jwt_token_${role}_${Date.now()}`;
    setToken(mockToken);
    setUser(demoUser);
    setActiveMode(role);
    localStorage.setItem('croplens_jwt', mockToken);
    localStorage.setItem('croplens_user', JSON.stringify(demoUser));
    setAuthLoading(false);
  };

  const loginUser = (tokenStr, userData) => {
    setToken(tokenStr);
    setUser(userData);
    setActiveMode(userData.role || 'farmer');
    localStorage.setItem('croplens_jwt', tokenStr);
    localStorage.setItem('croplens_user', JSON.stringify(userData));
    setAuthLoading(false);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const newObj = { ...prev, ...updatedFields };
      localStorage.setItem('croplens_user', JSON.stringify(newObj));
      return newObj;
    });
  };

  const logout = () => {
    isValidatingRef.current = false;
    setToken(null);
    setUser(null);
    localStorage.removeItem('croplens_jwt');
    localStorage.removeItem('croplens_user');
    setAuthLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      authLoading,
      activeMode,
      setActiveMode,
      loginUser,
      loginWithDemo,
      updateUser,
      logout,
      isAuthenticated: !!token && !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
