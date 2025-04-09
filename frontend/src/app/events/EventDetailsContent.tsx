// app/events/EventDetailsContent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, Users, FileText, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  target_audience: string;
  artists: {
    artist_id: string;
    artist_name: string;
    amount: number;
    is_paid: boolean;
    payment_proof_url?: string;
  }[];
}

interface EventReport {
  id: string;
  file_url: string;
  file_type: "photo" | "video" | "document";
  description?: string;
  created_at: string;
}

const BASE_URL = "http://localhost:5000";

export default function EventDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user, isAuthLoading } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [reports, setReports] = useState<EventReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEventDetails = useCallback(async () => {
    if (!id) {
      toast({
        title: "❌ ID não fornecido",
        description: "Nenhum ID de evento foi fornecido na URL.",
        variant: "destructive",
      });
      router.push("/search");
      return;
    }

    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "❌ Token não encontrado",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      const eventResponse = await axios.get(`${BASE_URL}/api/events/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setEvent(eventResponse.data);

      const reportsResponse = await axios.get(
        `${BASE_URL}/api/events/${id}/reports`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setReports(reportsResponse.data);
    } catch (error) {
      let errorMessage = "Ocorreu um erro inesperado";
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          errorMessage = "Evento não encontrado.";
        } else if (error.response?.status === 401) {
          errorMessage = "Sessão expirada. Faça login novamente.";
          router.push("/login");
        } else {
          errorMessage = error.response?.data?.error || error.message;
        }
      }
      toast({
        title: "❌ Erro ao buscar detalhes do evento",
        description: errorMessage,
        variant: "destructive",
      });
      router.push("/search");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchEventDetails();
    }
  }, [isAuthLoading, user, fetchEventDetails]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Data inválida";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  };

  const downloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }
  if (!event) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Detalhes do Evento - {event.title}
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/events/edit?id=${id}`)}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Pencil className="w-4 h-4" />
              <span>Editar</span>
            </Button>
            <Button variant="outline" onClick={() => router.push("/search")}>
              Voltar
            </Button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Informações do Evento</h2>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>
                <strong>Título:</strong> {event.title}
              </span>
            </div>
            {event.description && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>
                  <strong>Descrição:</strong> {event.description}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>
                <strong>Data:</strong> {formatDate(event.date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>
                <strong>Local:</strong> {event.location}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>
                <strong>Público-Alvo:</strong> {event.target_audience}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Artistas Associados</h2>
          <Separator className="my-4" />
          {event.artists.length > 0 ? (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Quantia (R$)</TableHead>
                    <TableHead>Status de Pagamento</TableHead>
                    <TableHead>Comprovante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.artists.map((artist) => (
                    <TableRow key={artist.artist_id}>
                      <TableCell>{artist.artist_name}</TableCell>
                      <TableCell>{artist.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {artist.is_paid ? (
                          <span className="text-green-600">Pago</span>
                        ) : (
                          <span className="text-red-600">Pendente</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {artist.is_paid && artist.payment_proof_url ? (
                          <a
                            href={artist.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            Visualizar Comprovante
                          </a>
                        ) : (
                          <span className="text-gray-600">
                            Nenhum comprovante
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-600">
              Nenhum artista associado a este evento.
            </p>
          )}
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Relatórios do Evento</h2>
          <Separator className="my-4" />
          {reports.length > 0 ? (
            <ul className="space-y-4">
              {reports.map((report) => (
                <li key={report.id} className="p-4 bg-gray-100 rounded-md">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-gray-900">
                        <strong>Tipo:</strong>{" "}
                        {report.file_type.charAt(0).toUpperCase() +
                          report.file_type.slice(1)}
                      </p>
                      {report.description && (
                        <p className="text-gray-600">
                          <strong>Descrição:</strong> {report.description}
                        </p>
                      )}
                      <Button
                        variant="link"
                        className="p-0 text-indigo-600 hover:underline"
                        onClick={() =>
                          downloadFile(
                            report.file_url,
                            `relatorio-${report.id}.${
                              report.file_type === "photo"
                                ? "jpg"
                                : report.file_type === "video"
                                ? "mp4"
                                : "pdf"
                            }`
                          )
                        }
                      >
                        Baixar Relatório
                      </Button>
                    </div>
                    <p className="text-gray-600">
                      {formatDateTime(report.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">Nenhum relatório adicionado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
