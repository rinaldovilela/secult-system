"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import Loading from "@/components/ui/loading";

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  artists: { artist_id: number; amount: number; is_paid: boolean }[];
}

export default function Profile() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth() as {
    user: { id: number; name: string } | null;
    isAuthLoading: boolean;
  };
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null) {
      router.push("/login");
      return;
    }

    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Filtra os eventos para mostrar apenas aqueles em que o artista logado participa
        const userId = user.id; // Supondo que o user retornado pelo useAuth tenha o id
        const filteredEvents = response.data.filter((event: Event) =>
          event.artists.some((artist) => artist.artist_id === userId)
        );
        setEvents(filteredEvents);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar eventos: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar eventos: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Meu Perfil - {user.name}
      </h1>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
            Eventos Participados
          </h2>
          {events.length > 0 ? (
            <ul className="space-y-4">
              {events.map((event) => {
                const artistData = event.artists.find(
                  (artist) => artist.artist_id === user.id
                );
                return (
                  <li
                    key={event.id}
                    className="p-4 bg-white rounded-lg shadow-md"
                  >
                    <p>
                      <strong>Evento:</strong> {event.title}
                    </p>
                    <p>
                      <strong>Data:</strong>{" "}
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Local:</strong> {event.location}
                    </p>
                    <p>
                      <strong>Quantia:</strong> R${" "}
                      {artistData?.amount.toFixed(2)}
                    </p>
                    <p>
                      <strong>Status de Pagamento:</strong>{" "}
                      {artistData?.is_paid ? "Pago" : "Pendente"}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-neutral-700">
              Você ainda não participou de nenhum evento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
