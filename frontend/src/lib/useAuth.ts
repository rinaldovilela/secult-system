import { useState, useEffect } from "react";
import { getUser } from "./auth";

export const useAuth = () => {
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = getUser();
      setUser(updatedUser);
    };

    // Escuta mudanças no localStorage
    window.addEventListener("storage", handleStorageChange);

    // Verifica mudanças no mesmo contexto (mesma aba)
    const interval = setInterval(() => {
      const updatedUser = getUser();
      if (JSON.stringify(updatedUser) !== JSON.stringify(user)) {
        setUser(updatedUser);
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  return user;
};
