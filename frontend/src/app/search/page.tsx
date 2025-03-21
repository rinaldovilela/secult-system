"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loading from "@/components/ui/loading";

interface Event {
  id: number;
  title: string;
  description?: string;
  date: string;
  location: string;
  target_audience: string;
  artists: {
    artist_id: number;
    artist_name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

export default function Search() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [titleFilter, setTitleFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all");

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEvents(response.data);
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

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    const matchesTitle = event.title
      .toLowerCase()
      .includes(titleFilter.toLowerCase());
    const matchesDateStart = dateStart
      ? eventDate >= new Date(dateStart)
      : true;
    const matchesDateEnd = dateEnd ? eventDate <= new Date(dateEnd) : true;
    const matchesPaymentStatus =
      paymentStatus && paymentStatus !== "all"
        ? event.artists.some((artist) =>
            paymentStatus === "paid" ? artist.is_paid : !artist.is_paid
          )
        : true;
    return (
      matchesTitle && matchesDateStart && matchesDateEnd && matchesPaymentStatus
    );
  });

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">Consulta</h1>
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700">
              Título do Evento
            </label>
            <Input
              type="text"
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              placeholder="Digite o título do evento"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700">
              Data Inicial
            </label>
            <Input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700">
              Data Final
            </label>
            <Input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700">
              Status de Pagamento
            </label>
            <Select onValueChange={setPaymentStatus} value={paymentStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
          Eventos
        </h2>
        {filteredEvents.length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Artistas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.id}</TableCell>
                    <TableCell>{event.title}</TableCell>
                    <TableCell>
                      {new Date(event.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{event.description || "-"}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {event.artists.map((artist) => (
                          <li key={artist.artist_id}>
                            {artist.artist_name} - R$ {artist.amount.toFixed(2)}{" "}
                            - {artist.is_paid ? "Pago" : "Pendente"}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-neutral-700">Nenhum evento encontrado.</p>
        )}
      </div>
    </div>
  );
}
