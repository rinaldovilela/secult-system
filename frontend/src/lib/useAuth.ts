import { useState, useEffect } from "react";
import { getUser } from "./auth";

export const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Garante que a lógica só seja executada no lado do cliente
    if (typeof window === "undefined") return;

    // Define o estado inicial do usuário
    const initialUser = getUser();
    setUser(initialUser);

    const handleStorageChange = () => {
      const updatedUser = getUser();
      setUser((prevUser) => {
        // Só atualiza o estado se o usuário realmente mudou
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
        // Só atualiza o estado se o usuário realmente mudou
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
  }, []); // Removemos `user` da lista de dependências

  return user;
};
