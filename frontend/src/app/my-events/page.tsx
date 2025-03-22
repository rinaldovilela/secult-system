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
import { getToken } from "@/lib/auth"; // Certifique-se de que getToken está disponível

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
        const token = getToken(); // Usar getToken para consistência com outras páginas
        if (!token) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }

        const response = await axios.get(
          "http://localhost:5000/api/users/me/events",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Eventos retornados:", response.data);
        setEvents(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "Erro ao carregar eventos:",
            error.response?.data || error.message
          );
          toast.error(
            `Erro ao carregar eventos: ${
              error.response?.data?.error || error.message
            }`
          );
          if (
            error.response?.status === 403 ||
            error.response?.status === 401
          ) {
            console.log(
              "Erro de autenticação (403/401), redirecionando para /login"
            );
            router.push("/login");
          }
        } else {
          console.error("Erro desconhecido ao carregar eventos:", error);
          toast.error(`Erro ao carregar eventos: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthLoading) return;
    if (!user) {
      console.log("Usuário não autenticado, redirecionando para /login");
      router.push("/login");
      return;
    }
    if (!["artist", "group"].includes(user.role)) {
      console.log("Usuário não é artist ou group, redirecionando para /login");
      router.push("/login");
      return;
    }

    fetchEvents();
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">Meus Eventos</h1>
      {events.length === 0 ? (
        <p className="text-neutral-600">
          Você ainda não participou de nenhum evento.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>
                    {new Date(event.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        event.status === "Confirmado"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
