"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { useSocket } from "@/lib/SocketContext";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle } from "lucide-react";

export default function Notifications() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const { notifications, markNotificationAsRead } = useSocket();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setIsLoading(false);
  }, [user, isAuthLoading, router]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      await axios.patch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      markNotificationAsRead(notificationId);
      toast.success("Notificação marcada como lida");
    } catch (error) {
      toast.error(
        axios.isAxiosError(error)
          ? `Erro ao marcar notificação: ${
              error.response?.data?.error || error.message
            }`
          : `Erro ao marcar notificação: ${String(error)}`
      );
    }
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Minhas Notificações
        </h1>

        {notifications.length === 0 ? (
          <div className="bg-white shadow-lg rounded-lg p-6 text-center">
            <p className="text-gray-600">
              Você não tem notificações no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg shadow-md flex justify-between items-center ${
                  notification.is_read ? "bg-gray-100" : "bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p
                      className={`text-sm ${
                        notification.is_read
                          ? "text-gray-600"
                          : "text-gray-900 font-semibold"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString(
                        "pt-BR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                </div>
                {!notification.is_read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Lida
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
