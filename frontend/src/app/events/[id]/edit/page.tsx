"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface Artist {
  id: number;
  name: string;
}

export default function EditEvent() {
  const router = useRouter();
  const { id } = useParams();
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

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    const fetchEventAndArtists = async () => {
      try {
        const token = localStorage.getItem("token");

        const eventResponse = await axios.get(
          `http://localhost:5000/api/events/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEvent(eventResponse.data);
        setTitle(eventResponse.data.title);
        setDescription(eventResponse.data.description || "");
        setDate(new Date(eventResponse.data.date).toISOString().split("T")[0]);
        setLocation(eventResponse.data.location);
        setTargetAudience(eventResponse.data.target_audience);

        const artistsResponse = await axios.get(
          "http://localhost:5000/api/users/artists",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setArtists(artistsResponse.data);
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
      await axios.put(`http://localhost:5000/api/events/${id}`, payload, {
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
        `http://localhost:5000/api/events/${id}/artists`,
        {
          artist_id: selectedArtistId,
          amount: parseFloat(artistAmount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Artista adicionado com sucesso!");

      const eventResponse = await axios.get(
        `http://localhost:5000/api/events/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
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

  const handleRemoveArtist = async (artistId: number) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/events/${id}/artists/${artistId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Artista removido com sucesso!");

      const eventResponse = await axios.get(
        `http://localhost:5000/api/events/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEvent(eventResponse.data);
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
    artistId: number,
    isPaid: boolean
  ) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localhost:5000/api/events/${id}/artists/${artistId}`,
        {
          is_paid: !isPaid,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Status de pagamento atualizado com sucesso!");

      const eventResponse = await axios.get(
        `http://localhost:5000/api/events/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEvent(eventResponse.data);
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

          {/* Seção para gerenciar artistas */}
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
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.artists.map((artist) => (
                      <TableRow key={artist.artist_id}>
                        <TableCell>{artist.artist_name}</TableCell>
                        <TableCell>R$ {artist.amount.toFixed(2)}</TableCell>
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

            {/* Formulário para adicionar um novo artista */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Adicionar Novo Artista
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Artista
                  </label>
                  <Select
                    onValueChange={setSelectedArtistId}
                    value={selectedArtistId}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder="Selecione um artista" />
                    </SelectTrigger>
                    <SelectContent>
                      {artists.map((artist) => (
                        <SelectItem
                          key={artist.id}
                          value={artist.id.toString()}
                        >
                          {artist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        </div>
      </div>
    </div>
  );
}
