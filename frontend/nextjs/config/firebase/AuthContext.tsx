'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getAuth, User } from 'firebase/auth';
import { app } from './firebase';
import axios from 'axios';

const auth = getAuth(app);

// Add base URL constant
const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

export interface AuthContextProps {
  user: User | null;
  loading: boolean;
  userProfile: any | null;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  userProfile: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          const token = await user.getIdToken();
          // Add BASE_URL to the axios request
          const response = await axios.get(`${BASE_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserProfile(response.data);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUserProfile(null);  // Ensure profile is cleared on error
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, userProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
