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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { Calendar, FileText, CheckCircle, Clock } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }

        const response = await axios.get(`${BASE_URL}/api/users/me/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Dados retornados pela API:", response.data);

        if (!Array.isArray(response.data)) {
          throw new Error("Os dados retornados não são uma lista de eventos.");
        }

        const validatedEvents = response.data
          .map((event: Partial<Event>) => {
            if (!event.id || !event.title || !event.date || !event.status) {
              console.warn("Evento com estrutura inválida:", event);
              return null;
            }
            return {
              id: event.id,
              title: event.title,
              date: event.date,
              status: event.status,
            } as Event;
          })
          .filter((event: Event | null): event is Event => event !== null);

        setEvents(validatedEvents);
        if (validatedEvents.length === 0) {
          setError("Nenhum evento válido encontrado.");
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = `Erro ao carregar eventos: ${
            error.response?.data?.error || error.message
          }`;
          setError(errorMessage);
          toast.error(errorMessage);
          if (
            error.response?.status === 403 ||
            error.response?.status === 401
          ) {
            router.push("/login");
          }
        } else {
          const errorMessage = `Erro ao carregar eventos: ${String(error)}`;
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!["artist", "group"].includes(user.role)) {
      router.push("/login");
      return;
    }

    fetchEvents();
  }, [user, isAuthLoading, router, BASE_URL]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Meus Eventos
        </h1>
        {error ? (
          <div className="bg-white shadow-lg rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button
              asChild
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Link href="/search">Buscar Eventos</Link>
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white shadow-lg rounded-lg p-6 text-center">
            <p className="text-gray-600">
              Você ainda não participou de nenhum evento.
            </p>
            <Button
              asChild
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Link href="/search">Buscar Eventos</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span>Evento</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <span>Data</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                        <span>Status</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <span>Ações</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{event.title}</TableCell>
                      <TableCell>
                        {new Date(event.date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            event.status === "Confirmado"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {event.status === "Confirmado" ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                          {event.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          variant="outline"
                          className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        >
                          <Link href={`/events/${event.id}`}>Ver Detalhes</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
