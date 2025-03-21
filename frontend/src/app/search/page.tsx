"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Search() {
  const router = useRouter();
  const user = getUser();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const [artists, setArtists] = useState([]);
  const [events, setEvents] = useState([]);
  const [artistFilter, setArtistFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const artistsResponse = await axios.get(
          "http://localhost:5000/api/artists",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setArtists(artistsResponse.data);

        const eventsResponse = await axios.get(
          "http://localhost:5000/api/events",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEvents(eventsResponse.data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };
    if (user) fetchData();
  }, [user]);

  const filteredArtists = artists.filter((artist: any) =>
    artist.name.toLowerCase().includes(artistFilter.toLowerCase())
  );

  const filteredEvents = events.filter((event: any) =>
    event.title.toLowerCase().includes(eventFilter.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Consulta e Pesquisa
      </h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Artistas</h2>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Filtrar por nome do artista"
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Biografia</TableHead>
              <TableHead>Portfólio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredArtists.map((artist: any) => (
              <TableRow key={artist.id}>
                <TableCell>{artist.name}</TableCell>
                <TableCell>{artist.email}</TableCell>
                <TableCell>{artist.bio || "N/A"}</TableCell>
                <TableCell>
                  {artist.portfolioUrl ? (
                    <a
                      href={artist.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-500 hover:underline cursor-pointer"
                    >
                      Ver Portfólio
                    </a>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Eventos</h2>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Filtrar por título do evento"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Público-Alvo</TableHead>
              <TableHead>Artistas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event: any) => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>{new Date(event.date).toLocaleString()}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>{event.target_audience || "N/A"}</TableCell>
                <TableCell>{event.artist_names || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
