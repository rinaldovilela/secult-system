import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  exp: number;
  id: number;
  email: string;
  role: string;
}

export const getToken = () => {
  return localStorage.getItem("token");
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  const token = getToken();

  if (!token || !user) return null;

  try {
    const decoded: DecodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null;
    }
    return JSON.parse(user);
  } catch (error) {
    console.error("Erro ao decodificar token:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
};
