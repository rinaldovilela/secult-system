"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loading from "@/components/ui/loading";

interface Artist {
  id: number;
  name: string;
  email: string;
  bio?: string;
  portfolioUrl?: string;
  art_type?: string;
}

interface Event {
  id: number;
  title: string;
  description?: string;
  date: string;
  location: string;
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
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [artType, setArtType] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [artistsResponse, eventsResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/artists", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/events", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setArtists(artistsResponse.data);
        setEvents(eventsResponse.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar dados: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar dados: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isAuthLoading, router]);

  const filteredArtists = artists.filter((artist) => {
    const matchesSearchTerm =
      artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artist.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArtType = artType ? artist.art_type === artType : true;
    return matchesSearchTerm && matchesArtType;
  });

  const filteredEvents = events.filter((event) => {
    const matchesSearchTerm =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const eventDate = new Date(event.date);
    const matchesDateStart = dateStart
      ? eventDate >= new Date(dateStart)
      : true;
    const matchesDateEnd = dateEnd ? eventDate <= new Date(dateEnd) : true;
    const matchesPaymentStatus = paymentStatus
      ? event.artists.some((artist) =>
          paymentStatus === "paid" ? artist.is_paid : !artist.is_paid
        )
      : true;
    return (
      matchesSearchTerm &&
      matchesDateStart &&
      matchesDateEnd &&
      matchesPaymentStatus
    );
  });

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Consultar Artistas e Eventos
      </h1>
      <div className="mb-6 space-y-4">
        <Input
          placeholder="Pesquisar por nome, email, título ou local..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-col sm:flex-row gap-4">
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
              Tipo de Arte
            </label>
            <Select onValueChange={setArtType} value={artType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de arte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="música">Música</SelectItem>
                <SelectItem value="teatro">Teatro</SelectItem>
                <SelectItem value="dança">Dança</SelectItem>
                <SelectItem value="artes visuais">Artes Visuais</SelectItem>
                <SelectItem value="literatura">Literatura</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
            Artistas
          </h2>
          {filteredArtists.length > 0 ? (
            <ul className="space-y-4">
              {filteredArtists.map((artist) => (
                <li
                  key={artist.id}
                  className="p-4 bg-white rounded-lg shadow-md"
                >
                  <p>
                    <strong>Nome:</strong> {artist.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {artist.email}
                  </p>
                  {artist.art_type && (
                    <p>
                      <strong>Tipo de Arte:</strong> {artist.art_type}
                    </p>
                  )}
                  {artist.bio && (
                    <p>
                      <strong>Biografia:</strong> {artist.bio}
                    </p>
                  )}
                  {artist.portfolioUrl && (
                    <p>
                      <strong>Portfólio:</strong>{" "}
                      <a
                        href={artist.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {artist.portfolioUrl}
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-700">Nenhum artista encontrado.</p>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
            Eventos
          </h2>
          {filteredEvents.length > 0 ? (
            <ul className="space-y-4">
              {filteredEvents.map((event) => (
                <li
                  key={event.id}
                  className="p-4 bg-white rounded-lg shadow-md"
                >
                  <p>
                    <strong>Título:</strong> {event.title}
                  </p>
                  <p>
                    <strong>Data:</strong>{" "}
                    {new Date(event.date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Local:</strong> {event.location}
                  </p>
                  {event.description && (
                    <p>
                      <strong>Descrição:</strong> {event.description}
                    </p>
                  )}
                  <p>
                    <strong>Artistas:</strong>
                  </p>
                  <ul className="ml-4 list-disc">
                    {event.artists.map((artist) => (
                      <li key={artist.artist_id}>
                        {artist.artist_name} - R$ {artist.amount.toFixed(2)} -{" "}
                        {artist.is_paid ? "Pago" : "Pendente"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-700">Nenhum evento encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
