"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Loading from "@/components/ui/loading";

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  artists: {
    artist_id: number;
    artist_name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

export default function Profile() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth();
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
        const userId = Number(user.id);
        console.log("User ID:", userId);

        const response = await axios.get("http://localhost:5000/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Eventos retornados:", response.data);

        const filteredEvents = response.data.filter((event: Event) => {
          if (!Array.isArray(event.artists)) {
            console.log(
              `Evento ${event.id} não tem artists válido:`,
              event.artists
            );
            return false;
          }
          return event.artists.some((artist) => {
            const artistId = Number(artist.artist_id);
            console.log(
              `Comparando artistId: ${artistId} (${typeof artistId}) com userId: ${userId} (${typeof userId})`
            );
            return artistId === userId;
          });
        });

        console.log("Eventos filtrados:", filteredEvents);

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
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Quantia (R$)</TableHead>
                    <TableHead>Status de Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const artistData = event.artists.find(
                      (artist) => Number(artist.artist_id) === Number(user.id)
                    );
                    const amount =
                      artistData?.amount != null
                        ? Number(artistData.amount)
                        : 0;
                    return (
                      <TableRow key={event.id}>
                        <TableCell>{event.title}</TableCell>
                        <TableCell>
                          {new Date(event.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>R$ {amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {artistData?.is_paid ? "Pago" : "Pendente"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
