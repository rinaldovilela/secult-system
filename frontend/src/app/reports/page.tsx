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
import Loading from "@/components/ui/loading";
import { saveAs } from "file-saver";

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
  artists: {
    artist_id: number;
    artist_name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

export default function Reports() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth();
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

    const eventHeaders = [
      "ID",
      "Título",
      "Descrição",
      "Data",
      "Local",
      "Artista",
      "Quantia (R$)",
      "Pago",
    ];
    const eventRows = events.flatMap((event) =>
      event.artists.map((artist) => [
        event.id,
        event.title,
        event.description || "",
        new Date(event.date).toLocaleDateString(),
        event.location,
        artist.artist_name,
        artist.amount.toFixed(2),
        artist.is_paid ? "Sim" : "Não",
      ])
    );

    const csvContent = [
      "Relatório de Artistas",
      artistHeaders.join(","),
      ...artistRows.map((row) => row.join(",")),
      "",
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
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Biografia</TableHead>
                    <TableHead>Portfólio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artists.map((artist) => (
                    <TableRow key={artist.id}>
                      <TableCell>{artist.id}</TableCell>
                      <TableCell>{artist.name}</TableCell>
                      <TableCell>{artist.email}</TableCell>
                      <TableCell>{artist.bio || "-"}</TableCell>
                      <TableCell>
                        {artist.portfolioUrl ? (
                          <a
                            href={artist.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {artist.portfolioUrl}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-neutral-700">Nenhum artista encontrado.</p>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
            Eventos
          </h2>
          {events.length > 0 ? (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
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
                              {artist.artist_name} - R${" "}
                              {artist.amount.toFixed(2)} -{" "}
                              {artist.is_paid ? "Pago" : "Pendente"}
                            </li>
                          ))}
                        </ul>
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
    </div>
  );
}
