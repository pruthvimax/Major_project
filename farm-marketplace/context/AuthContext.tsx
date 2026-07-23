import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { AuthContextType, User, RegisterData } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      const token = await AsyncStorage.getItem('token');
      
      // Clear old localStorage-based auth data
      const oldFarmers = await AsyncStorage.getItem('farmers');
      const oldBuyers = await AsyncStorage.getItem('buyers');
      if (oldFarmers || oldBuyers) {
        await AsyncStorage.multiRemove(['farmers', 'buyers']);
        console.log('Cleared old auth data');
      }
      
      if (userData && token) {
        setUser(JSON.parse(userData));
      } else {
        // Clear inconsistent data
        if (userData || token) {
          await AsyncStorage.multiRemove(['currentUser', 'token']);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role: 'farmer' | 'buyer' | 'admin') => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user: apiUser } = response.data;
        
        // Store token
        await AsyncStorage.setItem('token', token);
        
        // Map backend user to frontend User type
        const mappedUser: User = {
          id: apiUser._id,
          name: apiUser.name,
          email: apiUser.email,
          mobile: apiUser.mobile,
          address: typeof apiUser.address === 'string' ? apiUser.address : JSON.stringify(apiUser.address || {}),
          role: apiUser.role,
        };
        
        await AsyncStorage.setItem('currentUser', JSON.stringify(mappedUser));
        setUser(mappedUser);
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('currentUser');
      await AsyncStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData, role: 'farmer' | 'buyer') => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', {
        ...userData,
        role,
      });
      
      if (response.data.success) {
        const { token, user: apiUser } = response.data;
        
        // Store token
        await AsyncStorage.setItem('token', token);
        
        // Map backend user to frontend User type
        const mappedUser: User = {
          id: apiUser._id,
          name: apiUser.name,
          email: apiUser.email,
          mobile: apiUser.mobile,
          address: typeof apiUser.address === 'string' ? apiUser.address : JSON.stringify(apiUser.address || {}),
          role: apiUser.role,
        };
        
        await AsyncStorage.setItem('currentUser', JSON.stringify(mappedUser));
        setUser(mappedUser);
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};