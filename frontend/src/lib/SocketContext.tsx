// /lib/SocketContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/useAuth";
import { getToken } from "@/lib/auth";

interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Inicializar WebSocket
  useEffect(() => {
    if (!user) return;

    const token = getToken();
    if (!token) {
      console.error("[SocketContext] Token não encontrado para WebSocket");
      return;
    }

    const newSocket = io("http://localhost:5000", {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[SocketContext] WebSocket conectado com sucesso!");
    });

    newSocket.on("new_notification", (notification: Notification) => {
      console.log("[SocketContext] Nova notificação recebida:", notification);
      if (notification.user_id === parseInt(String(user.id))) {
        setNotifications((prev) => [notification, ...prev]);
        if (!notification.is_read) {
          setUnreadCount((prev) => prev + 1);
        }
      } else {
        console.log(
          `[SocketContext] Notificação ignorada: user_id ${notification.user_id} não corresponde ao usuário logado ${user.id}`
        );
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error(
        "[SocketContext] Erro ao conectar ao WebSocket:",
        error.message
      );
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("new_notification");
      newSocket.off("connect_error");
      newSocket.disconnect();
    };
  }, [user]);

  // Carregar notificações iniciais do backend
  useEffect(() => {
    if (!user || !socket) return;

    const fetchNotifications = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(
          "http://localhost:5000/api/notifications",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) throw new Error("Erro ao carregar notificações");
        const data: Notification[] = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      } catch (error) {
        console.error(
          "[SocketContext] Erro ao carregar notificações iniciais:",
          error
        );
      }
    };

    fetchNotifications();
  }, [user, socket]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markNotificationAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        unreadCount,
        addNotification,
        markNotificationAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
