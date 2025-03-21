"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { saveAs } from "file-saver"; // Biblioteca para baixar arquivos

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

export default function Reports() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth() as {
    user: { role: string } | null;
    isAuthLoading: boolean;
  };
  const [artists, setArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
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

  const downloadCSV = () => {
    // Cabeçalhos do CSV para artistas
    const artistHeaders = [
      "ID",
      "Nome",
      "Email",
      "Biografia",
      "URL do Portfólio",
    ];
    const artistRows = artists.map((artist) => [
      artist.id,
      artist.name,
      artist.email,
      artist.bio || "",
      artist.portfolioUrl || "",
    ]);

    // Cabeçalhos do CSV para eventos
    const eventHeaders = ["ID", "Título", "Descrição", "Data", "Local"];
    const eventRows = events.map((event) => [
      event.id,
      event.title,
      event.description || "",
      new Date(event.date).toLocaleDateString(),
      event.location,
    ]);

    // Combinar os dados em um único CSV
    const csvContent = [
      "Relatório de Artistas",
      artistHeaders.join(","),
      ...artistRows.map((row) => row.join(",")),
      "", // Linha em branco para separar
      "Relatório de Eventos",
      eventHeaders.join(","),
      ...eventRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "relatorio-secult-system.csv");
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-neutral-900">Relatórios</h1>
        <Button onClick={downloadCSV}>Baixar Relatório (CSV)</Button>
      </div>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
            Artistas
          </h2>
          {artists.length > 0 ? (
            <ul className="space-y-4">
              {artists.map((artist) => (
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
          {events.length > 0 ? (
            <ul className="space-y-4">
              {events.map((event) => (
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
