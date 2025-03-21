import { useState, useEffect } from "react";
import { getUser, User } from "./auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Garante que a lógica só seja executada no lado do cliente
    if (typeof window === "undefined") {
      setIsAuthLoading(false);
      return;
    }

    // Define o estado inicial do usuário
    const initialUser = getUser();
    setUser(initialUser);
    setIsAuthLoading(false);

    const handleStorageChange = () => {
      const updatedUser = getUser();
      setUser((prevUser) => {
        if (JSON.stringify(updatedUser) !== JSON.stringify(prevUser)) {
          return updatedUser;
        }
        return prevUser;
      });
    };

    // Escuta mudanças no localStorage
    window.addEventListener("storage", handleStorageChange);

    // Verifica mudanças no mesmo contexto (mesma aba)
    const interval = setInterval(() => {
      const updatedUser = getUser();
      setUser((prevUser) => {
        if (JSON.stringify(updatedUser) !== JSON.stringify(prevUser)) {
          return updatedUser;
        }
        return prevUser;
      });
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return { user, isAuthLoading };
};
