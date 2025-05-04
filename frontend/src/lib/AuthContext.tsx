"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { getUser, User, getToken } from "./auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthLoading: boolean;
  updateAuth: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const updateAuth = useCallback(() => {
    try {
      const currentToken = getToken();
      const currentUser = getUser();

      setToken(currentToken);
      setUser(currentUser);
    } catch (error) {
      console.error("Error updating auth state:", error);
      setToken(null);
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, []);

  useEffect(() => {
    updateAuth();
    setIsAuthLoading(false);

    const handleStorageChange = () => {
      updateAuth();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [updateAuth]);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthLoading, updateAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
