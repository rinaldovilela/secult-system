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
import { MaskedInput } from "@/components/MaskedInput";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  FileText,
  DollarSign,
  ArrowLeft,
  Plus,
  Trash,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getToken } from "@/lib/auth";

interface Artist {
  id: string;
  name: string;
  type: "artist" | "group";
}

interface EventArtist {
  artist_id: string;
  artist_name: string;
  type: "artist" | "group";
  amount: number;
}

interface LocationFields {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function NewEvent() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("00:00"); // Novo estado para a hora, com valor padrão 00:00
  const [location, setLocation] = useState<LocationFields>({
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "SP",
  });
  const [targetAudience, setTargetAudience] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artistAmount, setArtistAmount] = useState("");
  const [eventArtists, setEventArtists] = useState<EventArtist[]>([]);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepStatus, setCepStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    const fetchArtists = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Token não encontrado. Faça login novamente.");
        }
        const response = await axios.get(`${BASE_URL}/api/users/artists`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setArtists(response.data);
      } catch (error) {
        const errorMessage = axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : String(error);
        toast.error(`Erro ao buscar participantes: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtists();
  }, [user, isAuthLoading, router, BASE_URL]);

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    setCepStatus("loading");
    try {
      const response = await axios.get(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );
      const data = response.data;
      if (data.erro) {
        setCepStatus("error");
        toast.error("CEP não encontrado. Preencha os campos manualmente.");
        return;
      }

      setLocation((prev) => ({
        ...prev,
        cep,
        logradouro: data.logradouro || "",
        bairro: data.bairro || "",
        cidade: data.localidade || "",
        estado: data.uf || "SP",
      }));

      setCepStatus("success");
      toast.success("Endereço preenchido com sucesso!");
    } catch {
      setCepStatus("error");
      toast.error("Erro ao buscar CEP. Preencha os campos manualmente.");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleAddArtist = () => {
    if (!selectedArtistId || !artistAmount) {
      toast.error("Selecione um participante e informe o valor");
      return;
    }

    const artist = artists.find((a) => a.id === selectedArtistId);
    if (!artist) {
      toast.error("Participante não encontrado");
      return;
    }

    if (eventArtists.some((ea) => ea.artist_id === selectedArtistId)) {
      toast.error("Participante já adicionado ao evento");
      return;
    }

    setEventArtists([
      ...eventArtists,
      {
        artist_id: selectedArtistId,
        artist_name: artist.name,
        type: artist.type,
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
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      // Combinar data e hora em um único valor datetime
      const dateTimeString = `${date}T${time}:00`;
      const formattedDate = new Date(dateTimeString).toISOString();

      const locationString = [
        location.logradouro,
        location.numero,
        location.complemento ? location.complemento : null,
        location.bairro,
        `${location.cidade} - ${location.estado}`,
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        title,
        description,
        date: formattedDate,
        location: locationString,
        target_audience: targetAudience,
        artists: eventArtists.map((ea) => ({
          artist_id: ea.artist_id,
          amount: ea.amount,
        })),
      };

      await axios.post(`${BASE_URL}/api/events`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Evento criado com sucesso!");
      router.push("/search");
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : String(error);
      toast.error(`Erro ao criar evento: ${errorMessage}`);
    }
  };

  const artistOptions = artists.map((artist) => ({
    value: artist.id,
    label: artist.name,
  }));

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        <div className="bg-muted shadow-lg rounded-lg p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <svg
              className="w-12 h-12 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Criar Novo Evento
            </h1>
            <Button
              variant="outline"
              onClick={() => router.push("/search")}
              className="flex items-center gap-2 border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 shadow-sm transition-all duration-300 active:scale-95"
              aria-label="Voltar para a página de busca"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-label="Formulário de criação de novo evento"
          >
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Título *
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                  aria-label="Título do evento"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Descrição
                </label>
                <Input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                  aria-label="Descrição do evento"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="w-5 h-5 text-primary" />
                  Data e Hora *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                  <div>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                      aria-label="Data do evento"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Hora do evento"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="bg-muted/50 p-6 rounded-lg shadow-sm animate-in fade-in duration-500"
                style={{ animationDelay: "50ms" }}
              >
                <h2 className="text-xl font-semibold mb-4 text-foreground">
                  Local do Evento
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <MapPin className="w-5 h-5 text-primary" />
                      CEP *
                    </label>
                    <MaskedInput
                      mask="00000-000"
                      placeholder="00000-000"
                      defaultValue={location.cep}
                      onAccept={(value: string) => {
                        setLocation((prev) => ({ ...prev, cep: value }));
                        const cleanValue = value.replace(/\D/g, "");
                        if (cleanValue.length === 8) {
                          fetchAddressByCep(value);
                        }
                      }}
                      disabled={isLoadingCep}
                      className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                      aria-label="CEP do local do evento"
                    />
                    <div className="text-sm mt-1 flex items-center gap-2">
                      {cepStatus === "loading" && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <p className="text-muted-foreground">
                            Buscando endereço...
                          </p>
                        </>
                      )}
                      {cepStatus === "success" && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <p className="text-primary">
                            Endereço preenchido com sucesso!
                          </p>
                        </>
                      )}
                      {cepStatus === "error" && (
                        <>
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          <p className="text-destructive">
                            Não foi possível buscar o endereço.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">
                        Logradouro *
                      </label>
                      <Input
                        type="text"
                        value={location.logradouro}
                        onChange={(e) =>
                          setLocation((prev) => ({
                            ...prev,
                            logradouro: e.target.value,
                          }))
                        }
                        required
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Logradouro do local do evento"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">
                        Número *
                      </label>
                      <Input
                        type="text"
                        value={location.numero}
                        onChange={(e) =>
                          setLocation((prev) => ({
                            ...prev,
                            numero: e.target.value,
                          }))
                        }
                        required
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Número do local do evento"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Complemento
                    </label>
                    <Input
                      type="text"
                      value={location.complemento}
                      onChange={(e) =>
                        setLocation((prev) => ({
                          ...prev,
                          complemento: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                      aria-label="Complemento do local do evento"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">
                        Bairro *
                      </label>
                      <Input
                        type="text"
                        value={location.bairro}
                        onChange={(e) =>
                          setLocation((prev) => ({
                            ...prev,
                            bairro: e.target.value,
                          }))
                        }
                        required
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Bairro do local do evento"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground">
                        Cidade *
                      </label>
                      <Input
                        type="text"
                        value={location.cidade}
                        onChange={(e) =>
                          setLocation((prev) => ({
                            ...prev,
                            cidade: e.target.value,
                          }))
                        }
                        required
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Cidade do local do evento"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">
                      Estado (UF) *
                    </label>
                    <Select
                      onValueChange={(value) =>
                        setLocation((prev) => ({ ...prev, estado: value }))
                      }
                      value={location.estado}
                    >
                      <SelectTrigger
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Selecione o estado do local do evento"
                      >
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Público-Alvo
                </label>
                <Select
                  onValueChange={setTargetAudience}
                  value={targetAudience}
                >
                  <SelectTrigger
                    className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                    aria-label="Selecione o público-alvo"
                  >
                    <SelectValue placeholder="Selecione o público-alvo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Geral">Geral</SelectItem>
                    <SelectItem value="Infantil">Infantil</SelectItem>
                    <SelectItem value="Adulto">Adulto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seção para adicionar participantes */}
            <div
              className="bg-muted/50 p-6 rounded-lg shadow-sm animate-in fade-in duration-500"
              style={{ animationDelay: "100ms" }}
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground">
                Participantes
              </h2>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Participante
                  </label>
                  <Combobox
                    options={artistOptions}
                    value={selectedArtistId}
                    onChange={setSelectedArtistId}
                    placeholder="Selecione um participante..."
                    className="mt-1 rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                    aria-label="Selecionar participante para o evento"
                  />
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Quantia (R$)
                  </label>
                  <Input
                    type="number"
                    value={artistAmount}
                    onChange={(e) => setArtistAmount(e.target.value)}
                    placeholder="Digite o valor"
                    className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                    aria-label="Quantia a ser paga ao participante"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleAddArtist}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-sm transition-all duration-300 active:scale-95"
                    aria-label="Adicionar participante ao evento"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {eventArtists.length > 0 ? (
                <ul className="space-y-3">
                  {eventArtists.map((ea) => (
                    <li
                      key={ea.artist_id}
                      className="flex items-center justify-between p-4 bg-background rounded-md border border-muted-foreground/10 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {ea.type === "group" ? (
                            <Users className="w-5 h-5 text-primary" />
                          ) : (
                            <User className="w-5 h-5 text-primary" />
                          )}
                          <span className="text-foreground font-medium">
                            {ea.artist_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-primary" />
                          <Input
                            type="number"
                            value={ea.amount.toString()}
                            onChange={(e) =>
                              handleUpdateArtistAmount(
                                ea.artist_id,
                                e.target.value
                              )
                            }
                            className="w-32 rounded-md border-muted-foreground/20 bg-muted shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-label={`Quantia para o participante ${ea.artist_name}`}
                          />
                          <span className="text-muted-foreground text-sm">
                            ({formatCurrency(ea.amount)})
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveArtist(ea.artist_id)}
                        className="hover:bg-destructive/90 transition-all duration-300 active:scale-95"
                        aria-label={`Remover participante ${ea.artist_name} do evento`}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  Nenhum participante adicionado.
                </p>
              )}
            </div>

            <div
              className="flex flex-col sm:flex-row gap-4 pt-4 animate-in fade-in duration-500"
              style={{ animationDelay: "200ms" }}
            >
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md transition-all duration-300 active:scale-95"
                aria-label="Criar novo evento"
              >
                Criar Evento
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/search")}
                className="w-full sm:w-auto border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 shadow-sm transition-all duration-300 active:scale-95"
                aria-label="Cancelar criação do evento"
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
