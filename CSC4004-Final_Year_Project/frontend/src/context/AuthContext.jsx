import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { AuthContext } from './AuthContextValue';

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
      const {
        id,
        username,
        email,
        role,
        department,
        user_category,
        user_category_name,
        has_finance_privilege,
        has_finance_balance_access,
        has_resource_privilege,
        has_activity_privilege,
        has_control_privilege,
        has_announcement_view,
        has_announcement_create,
        has_announcement_publish,
        has_announcement_archive,
        has_announcement_manage_all,
        has_developer_options,
        has_destructive_maintenance,
        is_superuser,
      } = response.data;
      setUser({
        id,
        username,
        email,
        role,
        department,
        user_category,
        user_category_name,
        has_finance_privilege,
        has_finance_balance_access,
        has_resource_privilege,
        has_activity_privilege,
        has_control_privilege,
        has_announcement_view,
        has_announcement_create,
        has_announcement_publish,
        has_announcement_archive,
        has_announcement_manage_all,
        has_developer_options,
        has_destructive_maintenance,
        is_superuser,
      });
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setAuthTokens(null);
      setUser(null);
      localStorage.removeItem('authTokens');
    }
  }, [authTokens]);

  const applyTokensAndLoadProfile = async (tokens) => {
    setAuthTokens(tokens);
    localStorage.setItem('authTokens', JSON.stringify(tokens));
    const profileRes = await api.get('profile/');
    const {
      id,
      username: uname,
      email,
      role,
      department,
      user_category,
      user_category_name,
      has_finance_privilege,
      has_finance_balance_access,
      has_resource_privilege,
      has_activity_privilege,
      has_control_privilege,
      has_announcement_view,
      has_announcement_create,
      has_announcement_publish,
      has_announcement_archive,
      has_announcement_manage_all,
      has_developer_options,
      has_destructive_maintenance,
      is_superuser,
    } = profileRes.data;
    setUser({
      id,
      username: uname,
      email,
      role,
      department,
      user_category,
      user_category_name,
      has_finance_privilege,
      has_finance_balance_access,
      has_resource_privilege,
      has_activity_privilege,
      has_control_privilege,
      has_announcement_view,
      has_announcement_create,
      has_announcement_publish,
      has_announcement_archive,
      has_announcement_manage_all,
      has_developer_options,
      has_destructive_maintenance,
      is_superuser,
    });
  };

  const loginUser = async (username, password) => {
    try {
      const response = await api.post('token/', { username, password });
      await applyTokensAndLoadProfile(response.data);
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

  const loginWithGoogle = async (credential) => {
    try {
      const response = await api.post('auth/google/', { credential });
      await applyTokensAndLoadProfile(response.data);
      return { success: true };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Google sign-in failed. Please try again.';
      console.error('Google login failed', error);
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
    loginWithGoogle,
    logoutUser,
    loading,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
};
