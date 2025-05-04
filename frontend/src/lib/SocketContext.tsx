"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/AuthContext"; // Updated to use AuthContext

interface Notification {
  id: string;
  user_id: string;
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
  markNotificationAsRead: (notificationId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth(); // Now gets token from AuthContext
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(BASE_URL, {
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
      if (notification.user_id === user.id) {
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
  }, [user, token, BASE_URL]);

  useEffect(() => {
    if (!user || !socket) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao carregar notificações");
        }

        const data: Notification[] = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      } catch (error) {
        console.error(
          "[SocketContext] Erro ao carregar notificações iniciais:",
          error instanceof Error ? error.message : String(error)
        );
      }
    };

    fetchNotifications();
  }, [user, socket, token, BASE_URL]);

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    if (!notification.is_read) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
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
