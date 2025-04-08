"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import Loading from "@/components/ui/loading";
import { Calendar, MapPin, Users, FileText, DollarSign } from "lucide-react";

interface Artist {
  id: string;
  name: string;
}

interface EventArtist {
  artist_id: string;
  artist_name: string;
  amount: number;
}

export default function NewEvent() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artistAmount, setArtistAmount] = useState("");
  const [eventArtists, setEventArtists] = useState<EventArtist[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    const fetchArtists = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:5000/api/users/artists",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setArtists(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar artistas: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar artistas: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtists();
  }, [user, isAuthLoading, router]);

  const handleAddArtist = () => {
    if (!selectedArtistId || !artistAmount) {
      toast.error("Selecione um artista e informe o valor");
      return;
    }

    const artist = artists.find((a) => a.id === selectedArtistId);
    if (!artist) {
      toast.error("Artista não encontrado");
      return;
    }

    if (eventArtists.some((ea) => ea.artist_id === selectedArtistId)) {
      toast.error("Artista já adicionado ao evento");
      return;
    }

    setEventArtists([
      ...eventArtists,
      {
        artist_id: selectedArtistId,
        artist_name: artist.name,
        amount: parseFloat(artistAmount),
      },
    ]);
    setSelectedArtistId("");
    setArtistAmount("");
  };

  const handleRemoveArtist = (artistId: string) => {
    setEventArtists(eventArtists.filter((ea) => ea.artist_id !== artistId));
  };

  const handleUpdateArtistAmount = (artistId: string, newAmount: string) => {
    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Por favor, insira um valor válido.");
      return;
    }

    setEventArtists(
      eventArtists.map((ea) =>
        ea.artist_id === artistId ? { ...ea, amount: parsedAmount } : ea
      )
    );
  };

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
        artists: eventArtists.map((ea) => ({
          artist_id: ea.artist_id,
          amount: ea.amount,
        })),
      };
      await axios.post("http://localhost:5000/api/events", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Evento criado com sucesso!");
      router.push("/search");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao criar evento: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao criar evento: ${String(error)}`);
      }
    }
  };

  const artistOptions = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Criar Novo Evento
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

            {/* Seção para adicionar artistas */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Artistas
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Artista
                  </label>
                  <Combobox
                    options={artistOptions}
                    value={selectedArtistId}
                    onChange={setSelectedArtistId}
                    placeholder="Selecione um artista..."
                    className="mt-1"
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
                  <Button type="button" onClick={handleAddArtist}>
                    Adicionar
                  </Button>
                </div>
              </div>

              {eventArtists.length > 0 ? (
                <ul className="space-y-2">
                  {eventArtists.map((ea) => (
                    <li
                      key={ea.artist_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-100 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span>{ea.artist_name}</span>
                        <Input
                          type="number"
                          value={ea.amount.toString()}
                          onChange={(e) =>
                            handleUpdateArtistAmount(
                              ea.artist_id,
                              e.target.value
                            )
                          }
                          className="w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveArtist(ea.artist_id)}
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">Nenhum artista adicionado.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Criar Evento
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
        </div>
      </div>
    </div>
  );
}
