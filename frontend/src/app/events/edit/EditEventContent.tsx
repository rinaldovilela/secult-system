// app/events/edit/EditEventContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Loading from "@/components/ui/loading";
import { Calendar, MapPin, Users, FileText, DollarSign } from "lucide-react";

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

interface Artist {
  id: string;
  name: string;
}

interface EventReport {
  id: string;
  file_url: string;
  file_type: "photo" | "video" | "document";
  description?: string;
  created_at: string;
}

export default function EditEventContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artistAmount, setArtistAmount] = useState("");
  const [reports, setReports] = useState<EventReport[]>([]);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [reportFileType, setReportFileType] = useState<
    "photo" | "video" | "document" | ""
  >("");
  const [paymentProofFiles, setPaymentProofFiles] = useState<{
    [key: string]: File | null;
  }>({});

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    if (!id) {
      toast.error("ID do evento não fornecido.");
      router.push("/search");
      return;
    }

    const fetchEventAndArtists = async () => {
      try {
        const token = localStorage.getItem("token");

        const eventResponse = await axios.get(`${BASE_URL}/api/events/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEvent(eventResponse.data);
        setTitle(eventResponse.data.title);
        setDescription(eventResponse.data.description || "");
        setDate(new Date(eventResponse.data.date).toISOString().split("T")[0]);
        setLocation(eventResponse.data.location);
        setTargetAudience(eventResponse.data.target_audience);

        const artistsResponse = await axios.get(
          `${BASE_URL}/api/users/artists`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setArtists(artistsResponse.data);

        const reportsResponse = await axios.get(
          `${BASE_URL}/api/events/${id}/reports`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setReports(reportsResponse.data);
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
        router.push("/search");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventAndArtists();
  }, [id, user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const formattedDate = new Date(date).toISOString();
      const payload = {
        title,
        description,
        date: formattedDate,
        location,
        target_audience: targetAudience,
      };
      await axios.put(`${BASE_URL}/api/events/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Evento atualizado com sucesso!");
      router.push("/search");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao atualizar evento: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao atualizar evento: ${String(error)}`);
      }
    }
  };

  const handleAddArtist = async () => {
    if (!selectedArtistId || !artistAmount) {
      toast.error("Selecione um artista e informe o valor");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/events/${id}/artists`,
        {
          artist_id: selectedArtistId,
          amount: parseFloat(artistAmount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Artista adicionado com sucesso!");

      const eventResponse = await axios.get(`${BASE_URL}/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvent(eventResponse.data);
      setSelectedArtistId("");
      setArtistAmount("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao adicionar artista: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao adicionar artista: ${String(error)}`);
      }
    }
  };

  const handleRemoveArtist = async (artistId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/events/${id}/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Artista removido com sucesso!");

      const eventResponse = await axios.get(`${BASE_URL}/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvent(eventResponse.data);
      setPaymentProofFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[artistId];
        return newFiles;
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao remover artista: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao remover artista: ${String(error)}`);
      }
    }
  };

  const handleUpdatePaymentStatus = async (
    artistId: string,
    isPaid: boolean
  ) => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("is_paid", JSON.stringify(!isPaid));

      if (!isPaid && paymentProofFiles[artistId]) {
        formData.append("payment_proof", paymentProofFiles[artistId]);
      }

      await axios.patch(
        `${BASE_URL}/api/events/${id}/artists/${artistId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Status de pagamento atualizado com sucesso!");

      const eventResponse = await axios.get(`${BASE_URL}/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvent(eventResponse.data);

      if (!isPaid && paymentProofFiles[artistId]) {
        setPaymentProofFiles((prev) => {
          const newFiles = { ...prev };
          delete newFiles[artistId];
          return newFiles;
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao atualizar status de pagamento: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao atualizar status de pagamento: ${String(error)}`);
      }
    }
  };

  const handleUpdateArtistAmount = async (
    artistId: string,
    newAmount: string
  ) => {
    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Por favor, insira um valor válido.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${BASE_URL}/api/events/${id}/artists/${artistId}`,
        {
          amount: parsedAmount,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Valor atualizado com sucesso!");

      const eventResponse = await axios.get(`${BASE_URL}/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvent(eventResponse.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao atualizar valor: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao atualizar valor: ${String(error)}`);
      }
    }
  };

  const handleAddReport = async () => {
    if (!reportFile || !reportFileType) {
      toast.error("Selecione um arquivo e o tipo de relatório.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", reportFile);
      formData.append("file_type", reportFileType);
      if (reportDescription) {
        formData.append("description", reportDescription);
      }

      await axios.post(`${BASE_URL}/api/events/${id}/reports`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Relatório adicionado com sucesso!");

      const reportsResponse = await axios.get(
        `${BASE_URL}/api/events/${id}/reports`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReports(reportsResponse.data);
      setReportFile(null);
      setReportFileType("");
      setReportDescription("");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao adicionar relatório: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao adicionar relatório: ${String(error)}`);
      }
    }
  };

  const artistOptions = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;
  if (!event)
    return <div className="p-8 text-gray-600">Evento não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Editar Evento - {event.title}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-5 h-5 text-indigo-600" />
                Título
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-5 h-5 text-indigo-600" />
                Descrição
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Data
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="w-5 h-5 text-indigo-600" />
                Local
              </label>
              <Input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-5 h-5 text-indigo-600" />
                Público-Alvo
              </label>
              <Select onValueChange={setTargetAudience} value={targetAudience}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Selecione o público-alvo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Infantil">Infantil</SelectItem>
                  <SelectItem value="Adulto">Adulto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/search")}
                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Artistas Associados
            </h2>
            {event.artists.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Quantia (R$)</TableHead>
                      <TableHead>Status de Pagamento</TableHead>
                      <TableHead>Comprovante</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.artists.map((artist) => (
                      <TableRow key={artist.artist_id}>
                        <TableCell>{artist.artist_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={artist.amount.toString()}
                            onChange={(e) =>
                              handleUpdateArtistAmount(
                                artist.artist_id,
                                e.target.value
                              )
                            }
                            className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={artist.is_paid ? "default" : "outline"}
                            onClick={() =>
                              handleUpdatePaymentStatus(
                                artist.artist_id,
                                artist.is_paid
                              )
                            }
                            className={
                              artist.is_paid
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }
                          >
                            {artist.is_paid
                              ? "Marcar como Pendente"
                              : "Marcar como Pago"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {artist.is_paid ? (
                            artist.payment_proof_url ? (
                              <a
                                href={artist.payment_proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline"
                              >
                                Visualizar Comprovante
                              </a>
                            ) : (
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) =>
                                  setPaymentProofFiles({
                                    ...paymentProofFiles,
                                    [artist.artist_id]:
                                      e.target.files?.[0] || null,
                                  })
                                }
                                className="w-48"
                              />
                            )
                          ) : (
                            <p className="text-gray-600">Pendente</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            onClick={() => handleRemoveArtist(artist.artist_id)}
                          >
                            Remover
                          </Button>
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

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Adicionar Novo Artista
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Artista
                  </label>
                  <Combobox
                    options={artistOptions}
                    value={selectedArtistId}
                    onChange={setSelectedArtistId}
                    placeholder="Selecione um artista..."
                  />
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    Quantia (R$)
                  </label>
                  <Input
                    type="number"
                    value={artistAmount}
                    onChange={(e) => setArtistAmount(e.target.value)}
                    placeholder="Digite o valor"
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddArtist}>Adicionar</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Relatórios do Evento
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Relatório
                </label>
                <Select
                  onValueChange={(value: "photo" | "video" | "document") =>
                    setReportFileType(value)
                  }
                  value={reportFileType}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Selecione o tipo de relatório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="photo">Foto</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Arquivo
                </label>
                <Input
                  type="file"
                  accept={
                    reportFileType === "photo"
                      ? "image/*"
                      : reportFileType === "video"
                      ? "video/*"
                      : ".pdf,.doc,.docx"
                  }
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Descrição (opcional)
                </label>
                <Input
                  type="text"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Descreva o relatório..."
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <Button onClick={handleAddReport}>Adicionar Relatório</Button>
            </div>

            {reports.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  Relatórios Adicionados
                </h3>
                <ul className="space-y-2">
                  {reports.map((report) => (
                    <li key={report.id} className="p-2 bg-gray-100 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-gray-900">
                            Tipo:{" "}
                            {report.file_type.charAt(0).toUpperCase() +
                              report.file_type.slice(1)}
                          </p>
                          {report.description && (
                            <p className="text-gray-600">
                              Descrição: {report.description}
                            </p>
                          )}
                          <a
                            href={report.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            Visualizar
                          </a>
                        </div>
                        <p className="text-gray-600">
                          {new Date(report.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-gray-600">Nenhum relatório adicionado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
