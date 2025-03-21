import { useState, useEffect } from "react";
import { getUser, User } from "./auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsAuthLoading(false);
      return;
    }

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

    window.addEventListener("storage", handleStorageChange);

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
