import { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // Add specific auth loading state

  useEffect(() => {
    // Check if there's a token in localStorage and verify it
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await apiService.getProfile(); // Verify token with server
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('authToken');
        }
      }
      setAuthLoading(false); // Set loading to false regardless of outcome
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    const response = await apiService.login(username, password);
    const { token, user } = response.data;
    localStorage.setItem('authToken', token);
    setUser(user);
    return user;
  };

  const register = async (username, password) => {
    const response = await apiService.register(username, password);
    const { token, user } = response.data;
    localStorage.setItem('authToken', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!user;
  };

  // Share the loading state with consumers
  const value = {
    user,
    authLoading,
    login,
    register,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};