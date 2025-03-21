"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";

interface Artist {
  id: number;
  name: string;
  email: string;
  bio?: string;
  portfolioUrl?: string;
}

interface Event {
  id: number;
  title: string;
  description?: string;
  date: string;
  location: string;
}

export default function Search() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredArtists = artists.filter(
    (artist) =>
      artist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artist.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = events.filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Consultar Artistas e Eventos
      </h1>
      <div className="mb-6">
        <Input
          placeholder="Pesquisar por nome, email, título ou local..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
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
