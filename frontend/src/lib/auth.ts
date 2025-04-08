import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  exp: number;
  id: string;
  email: string;
  role: string;
}

export interface User {
  bio: string;
  area_of_expertise: string;
  id: string;
  name: string;
  role: string;
}

export const getToken = (): string | null => {
  // Verifica se estamos no lado do cliente (onde window está definido)
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("token");
};

export const getUser = (): User | null => {
  // Verifica se estamos no lado do cliente
  if (typeof window === "undefined") {
    return null;
  }

  const user = localStorage.getItem("user");
  const token = getToken();

  if (!token || !user) return null;

  try {
    const decoded: DecodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    // Verifica se o token expirou
    if (decoded.exp < currentTime) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage")); // Notifica outros componentes
      return null;
    }

    const parsedUser = JSON.parse(user);

    // Valida se o parsedUser tem os campos esperados
    if (
      !parsedUser ||
      typeof parsedUser.id !== "string" ||
      typeof parsedUser.name !== "string" ||
      typeof parsedUser.role !== "string"
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
      return null;
    }

    return parsedUser as User;
  } catch (error) {
    console.error("Erro ao decodificar token ou parsear usuário:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    return null;
  }
};
