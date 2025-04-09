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
import {
  User,
  Mail,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  email: string;
  bio?: string;
  portfolioUrl?: string;
}

interface Event {
  id: string;
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
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
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
          axios.get(`${BASE_URL}/api/artists`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BASE_URL}/api/events`, {
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
  }, [user, isAuthLoading, router, BASE_URL]);

  const downloadCSV = () => {
    const escapeCSVField = (field: string | undefined) => {
      if (!field) return "";
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const artistHeaders = [
      "ID",
      "Nome",
      "Email",
      "Biografia",
      "URL do Portfólio",
    ];
    const artistRows = artists.map((artist) => [
      artist.id,
      escapeCSVField(artist.name),
      escapeCSVField(artist.email),
      escapeCSVField(artist.bio),
      escapeCSVField(artist.portfolioUrl),
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
        escapeCSVField(event.title),
        escapeCSVField(event.description),
        new Date(event.date).toLocaleDateString("pt-BR"),
        escapeCSVField(event.location),
        escapeCSVField(artist.artist_name),
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
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Relatórios
          </h1>
          <Button
            onClick={downloadCSV}
            className="mt-4 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <FileText className="w-5 h-5 mr-2" />
            Baixar Relatório (CSV)
          </Button>
        </div>
        <div className="space-y-8">
          {/* Seção de Artistas */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">
              Artistas
            </h2>
            {artists.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-indigo-600" />
                          <span>ID</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-indigo-600" />
                          <span>Nome</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-indigo-600" />
                          <span>Email</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span>Biografia</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span>Portfólio</span>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artists.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell>{artist.id}</TableCell>
                        <TableCell>{artist.name}</TableCell>
                        <TableCell>{artist.email}</TableCell>
                        <TableCell>
                          {artist.bio || (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {artist.portfolioUrl ? (
                            <a
                              href={artist.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              Ver Portfólio
                            </a>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-600">Nenhum artista encontrado.</p>
            )}
          </div>

          {/* Seção de Eventos */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">
              Eventos
            </h2>
            {events.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span>ID</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span>Título</span>
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
                          <MapPin className="w-5 h-5 text-indigo-600" />
                          <span>Local</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <span>Descrição</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <User className="w-5 h-5 text-indigo-600" />
                          <span>Artistas</span>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.id}</TableCell>
                        <TableCell>{event.title}</TableCell>
                        <TableCell>
                          {new Date(event.date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>
                          {event.description || (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {event.artists.length > 0 ? (
                            <ul className="space-y-2">
                              {event.artists.map((artist) => (
                                <li
                                  key={artist.artist_id}
                                  className="flex items-center gap-2"
                                >
                                  <span>{artist.artist_name}</span>
                                  <span>-</span>
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-4 h-4 text-gray-600" />
                                    R$ {artist.amount.toFixed(2)}
                                  </span>
                                  <span>-</span>
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                      artist.is_paid
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {artist.is_paid ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Clock className="w-4 h-4" />
                                    )}
                                    {artist.is_paid ? "Pago" : "Pendente"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-500">
                              Nenhum artista
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-600">Nenhum evento encontrado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
