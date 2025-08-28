import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const loadUserFromStorage = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Set authorization header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    loadUserFromStorage();
  }, []);

  // Login function
  const login = async (username, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      const userData = response.data;
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set authorization header for all future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      
      setUser(userData);
      setLoading(false);
      return { success: true, data: userData };
    } catch (error) {
      const message = error.response?.data?.message || 
                     'Unable to login. Please check your credentials.';
      
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  const contextValue = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
