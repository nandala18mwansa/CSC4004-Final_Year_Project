import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(() => {
    const stored = localStorage.getItem('authTokens');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!authTokens) return;
    try {
      const response = await api.get('profile/');
      const { id, username, email, role, department } = response.data;
      setUser({ id, username, email, role, department });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setAuthTokens(null);
      setUser(null);
      localStorage.removeItem('authTokens');
    }
  }, [authTokens]);

  const loginUser = async (username, password) => {
    try {
      const response = await api.post('token/', { username, password });
      const tokens = response.data;
      setAuthTokens(tokens);
      localStorage.setItem('authTokens', JSON.stringify(tokens));
      const profileRes = await api.get('profile/');
      const { id, username: uname, email, role, department } = profileRes.data;
      setUser({ id, username: uname, email, role, department });
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Invalid credentials. Please try again.';
      console.error('Login failed', error);
      return { success: false, message };
    }
  };

  const logoutUser = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem('authTokens');
  };

  useEffect(() => {
    const init = async () => {
      if (authTokens) {
        await fetchProfile();
      }
      setLoading(false);
    };
    init();
  }, [authTokens, fetchProfile]);

  const contextData = {
    user,
    authTokens,
    loginUser,
    logoutUser,
    loading,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
};
