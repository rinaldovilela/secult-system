"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "@/components/ui/loading";

type Event = {
  id: number;
  title: string;
  date: string;
  status: string;
};

export default function MyEvents() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:5000/api/users/me/events",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setEvents(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao carregar eventos: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao carregar eventos: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEvents();
    }
  }, [user]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["artist", "group"].includes(user.role)) {
    router.push("/login");
    return null;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">Meus Eventos</h1>
      {events.length === 0 ? (
        <p className="text-neutral-600">
          Você ainda não participou de nenhum evento.
        </p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 bg-white shadow-md rounded-lg flex justify-between items-center"
            >
              <div>
                <h2 className="text-lg font-semibold">{event.title}</h2>
                <p className="text-sm text-neutral-600">Data: {event.date}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  event.status === "Confirmado"
                    ? "bg-green-100 text-green-800"
                    : event.status === "Pendente"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {event.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
