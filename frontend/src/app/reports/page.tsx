"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Users,
  Download,
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  email?: string; // Ajustado para opcional, já que os dados podem estar vazios
  role: "artist" | "group";
  bio?: string;
  area_of_expertise?: string;
  birth_date?: string;
}

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
  }[];
}

interface SummaryStats {
  totalEvents: number;
  totalArtists: number;
  totalPaid: number;
  totalPending: number;
}

export default function Reports() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalEvents: 0,
    totalArtists: 0,
    totalPaid: 0,
    totalPending: 0,
  });

  // Filtros para eventos
  const [eventDateStartFilter, setEventDateStartFilter] = useState("");
  const [eventDateEndFilter, setEventDateEndFilter] = useState("");
  const [eventPaymentFilter, setEventPaymentFilter] = useState<
    "all" | "paid" | "pending"
  >("all");
  const [eventTargetAudienceFilter, setEventTargetAudienceFilter] = useState<
    "all" | "Geral" | "Infantil" | "Adulto"
  >("all");

  // Filtros para artistas
  const [artistSearch, setArtistSearch] = useState("");
  const [artistTypeFilter, setArtistTypeFilter] = useState<
    "all" | "artist" | "group"
  >("all");

  // Colunas visíveis (eventos e artistas)
  const [visibleEventColumns, setVisibleEventColumns] = useState({
    id: false,
    title: true,
    date: true,
    location: true,
    target_audience: true,
    artists: true,
  });

  const [visibleArtistColumns, setVisibleArtistColumns] = useState({
    id: false,
    name: true,
    email: true,
    role: true,
    area_of_expertise: true,
    birth_date: true,
  });

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10; // Número de eventos por página

  // Ordenação
  const [sortColumn, setSortColumn] = useState<"date" | "title" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
          axios.get(`${BASE_URL}/api/users/artists`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BASE_URL}/api/events`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const fetchedArtists: Artist[] = artistsResponse.data;
        const fetchedEvents: Event[] = eventsResponse.data;

        // Log temporário para verificar os dados retornados
        console.log("Dados dos artistas retornados pela API:", fetchedArtists);

        setArtists(fetchedArtists);
        setFilteredArtists(fetchedArtists);
        setEvents(fetchedEvents);
        setFilteredEvents(fetchedEvents);

        // Calcular estatísticas de resumo
        const totalPaid = fetchedEvents
          .flatMap((event) => event.artists)
          .filter((artist) => artist.is_paid)
          .reduce((sum, artist) => sum + artist.amount, 0);
        const totalPending = fetchedEvents
          .flatMap((event) => event.artists)
          .filter((artist) => !artist.is_paid)
          .reduce((sum, artist) => sum + artist.amount, 0);

        setSummaryStats({
          totalEvents: fetchedEvents.length,
          totalArtists: fetchedArtists.length,
          totalPaid,
          totalPending,
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast({
            title: "Erro ao buscar dados",
            description: error.response?.data?.error || error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao buscar dados",
            description: String(error),
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isAuthLoading, router, BASE_URL]);

  // Filtrar e ordenar eventos com base nos filtros
  useEffect(() => {
    let filtered = [...events];

    // Filtro por intervalo de datas
    if (eventDateStartFilter || eventDateEndFilter) {
      const startDate = eventDateStartFilter
        ? new Date(eventDateStartFilter)
        : null;
      const endDate = eventDateEndFilter ? new Date(eventDateEndFilter) : null;

      filtered = filtered.filter((event) => {
        const eventDate = new Date(event.date);
        if (startDate && endDate) {
          return eventDate >= startDate && eventDate <= endDate;
        } else if (startDate) {
          return eventDate >= startDate;
        } else if (endDate) {
          return eventDate <= endDate;
        }
        return true;
      });
    }

    // Filtro por status de pagamento
    if (eventPaymentFilter !== "all") {
      filtered = filtered.filter((event) =>
        event.artists.some((artist) =>
          eventPaymentFilter === "paid" ? artist.is_paid : !artist.is_paid
        )
      );
    }

    // Filtro por público-alvo
    if (eventTargetAudienceFilter !== "all") {
      filtered = filtered.filter(
        (event) => event.target_audience === eventTargetAudienceFilter
      );
    }

    // Ordenação
    if (sortColumn) {
      filtered.sort((a, b) => {
        let valueA, valueB;
        if (sortColumn === "date") {
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
        } else {
          valueA = a[sortColumn].toLowerCase();
          valueB = b[sortColumn].toLowerCase();
        }

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredEvents(filtered);
    setCurrentPage(1); // Resetar a página para 1 ao aplicar filtros ou ordenação
  }, [
    eventDateStartFilter,
    eventDateEndFilter,
    eventPaymentFilter,
    eventTargetAudienceFilter,
    sortColumn,
    sortDirection,
    events,
  ]);

  // Filtrar artistas com base nos filtros
  useEffect(() => {
    let filtered = [...artists];

    if (artistSearch) {
      filtered = filtered.filter((artist) =>
        artist.name.toLowerCase().includes(artistSearch.toLowerCase())
      );
    }

    if (artistTypeFilter !== "all") {
      filtered = filtered.filter((artist) => artist.role === artistTypeFilter);
    }

    setFilteredArtists(filtered);
  }, [artistSearch, artistTypeFilter, artists]);

  // Calcular eventos a serem exibidos na página atual
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(
    indexOfFirstEvent,
    indexOfLastEvent
  );
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const downloadCSV = (type: "artists" | "events" | "all") => {
    const escapeCSVField = (field: string | undefined) => {
      if (!field) return "";
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvContent: string[] = [];

    if (type === "artists" || type === "all") {
      const artistHeaders = [];
      if (visibleArtistColumns.id) artistHeaders.push("ID");
      if (visibleArtistColumns.name) artistHeaders.push("Nome");
      if (visibleArtistColumns.email) artistHeaders.push("Email");
      if (visibleArtistColumns.role) artistHeaders.push("Tipo");
      if (visibleArtistColumns.area_of_expertise)
        artistHeaders.push("Área de Atuação");
      if (visibleArtistColumns.birth_date)
        artistHeaders.push("Data de Nascimento");

      const artistRows = filteredArtists.map((artist) => {
        const row: string[] = [];
        if (visibleArtistColumns.id) row.push(artist.id);
        if (visibleArtistColumns.name) row.push(escapeCSVField(artist.name));
        if (visibleArtistColumns.email) row.push(escapeCSVField(artist.email));
        if (visibleArtistColumns.role)
          row.push(artist.role === "artist" ? "Artista" : "Grupo");
        if (visibleArtistColumns.area_of_expertise)
          row.push(escapeCSVField(artist.area_of_expertise));
        if (visibleArtistColumns.birth_date)
          row.push(
            artist.birth_date
              ? new Date(artist.birth_date).toLocaleDateString("pt-BR")
              : ""
          );
        return row;
      });

      csvContent.push("Relatório de Artistas");
      csvContent.push(artistHeaders.join(","));
      csvContent.push(...artistRows.map((row) => row.join(",")));
      if (type === "all") csvContent.push("");
    }

    if (type === "events" || type === "all") {
      const eventHeaders = [];
      if (visibleEventColumns.id) eventHeaders.push("ID");
      if (visibleEventColumns.title) eventHeaders.push("Título");
      if (visibleEventColumns.date) eventHeaders.push("Data");
      if (visibleEventColumns.location) eventHeaders.push("Local");
      if (visibleEventColumns.target_audience)
        eventHeaders.push("Público-Alvo");
      if (visibleEventColumns.artists)
        eventHeaders.push("Artista", "Quantia (R$)", "Pago");

      const eventRows = filteredEvents.flatMap((event) =>
        event.artists.map((artist) => {
          const row: string[] = [];
          if (visibleEventColumns.id) row.push(event.id);
          if (visibleEventColumns.title) row.push(escapeCSVField(event.title));
          if (visibleEventColumns.date)
            row.push(new Date(event.date).toLocaleDateString("pt-BR"));
          if (visibleEventColumns.location)
            row.push(escapeCSVField(event.location));
          if (visibleEventColumns.target_audience)
            row.push(escapeCSVField(event.target_audience));
          if (visibleEventColumns.artists) {
            row.push(escapeCSVField(artist.artist_name));
            row.push(artist.amount.toFixed(2));
            row.push(artist.is_paid ? "Sim" : "Não");
          }
          return row;
        })
      );

      csvContent.push("Relatório de Eventos");
      csvContent.push(eventHeaders.join(","));
      csvContent.push(...eventRows.map((row) => row.join(",")));
    }

    const blob = new Blob([csvContent.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `relatorio-secult-${type}.csv`);
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-background py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Seção de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <p className="text-muted-foreground text-sm">Total de Eventos</p>
              <p className="text-xl font-bold text-foreground">
                {summaryStats.totalEvents}
              </p>
            </div>
          </div>
          <div className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-muted-foreground text-sm">Total de Artistas</p>
              <p className="text-xl font-bold text-foreground">
                {summaryStats.totalArtists}
              </p>
            </div>
          </div>
          <div className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-muted-foreground text-sm">Total Pago</p>
              <p className="text-xl font-bold text-foreground">
                R$ {summaryStats.totalPaid.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-muted-foreground text-sm">Total Pendente</p>
              <p className="text-xl font-bold text-foreground">
                R$ {summaryStats.totalPending.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Cabeçalho e Botões de Exportação */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Relatórios
          </h1>
          <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
            <Button
              onClick={() => downloadCSV("artists")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Artistas (CSV)
            </Button>
            <Button
              onClick={() => downloadCSV("events")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Eventos (CSV)
            </Button>
            <Button
              onClick={() => downloadCSV("all")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Tudo (CSV)
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Seção de Artistas */}
          <div className="bg-muted shadow-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              Artistas
            </h2>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={artistSearch}
                  onChange={(e) => setArtistSearch(e.target.value)}
                  className="w-full sm:w-64 border-muted-foreground/20 focus:border-primary"
                />
                <Select
                  value={artistTypeFilter}
                  onValueChange={(value: "all" | "artist" | "group") =>
                    setArtistTypeFilter(value)
                  }
                >
                  <SelectTrigger className="w-full sm:w-48 border-muted-foreground/20">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="artist">Artistas</SelectItem>
                    <SelectItem value="group">Grupos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Selecionar Colunas Visíveis
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="artist-id"
                    checked={visibleArtistColumns.id}
                    onCheckedChange={(checked) =>
                      setVisibleArtistColumns((prev) => ({
                        ...prev,
                        id: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="artist-id"
                    className="text-sm text-muted-foreground"
                  >
                    ID
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="artist-name"
                    checked={visibleArtistColumns.name}
                    onCheckedChange={(checked) =>
                      setVisibleArtistColumns((prev) => ({
                        ...prev,
                        name: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="artist-name"
                    className="text-sm text-muted-foreground"
                  >
                    Nome
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="artist-email"
                    checked={visibleArtistColumns.email}
                    onCheckedChange={(checked) =>
                      setVisibleArtistColumns((prev) => ({
                        ...prev,
                        email: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="artist-email"
                    className="text-sm text-muted-foreground"
                  >
                    Email
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="artist-role"
                    checked={visibleArtistColumns.role}
                    onCheckedChange={(checked) =>
                      setVisibleArtistColumns((prev) => ({
                        ...prev,
                        role: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="artist-role"
                    className="text-sm text-muted-foreground"
                  >
                    Tipo
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="artist-area"
                    checked={visibleArtistColumns.area_of_expertise}
                    onCheckedChange={(checked) =>
                      setVisibleArtistColumns((prev) => ({
                        ...prev,
                        area_of_expertise: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="artist-area"
                    className="text-sm text-muted-foreground"
                  >
                    Área de Atuação
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="artist-birth"
                    checked={visibleArtistColumns.birth_date}
                    onCheckedChange={(checked) =>
                      setVisibleArtistColumns((prev) => ({
                        ...prev,
                        birth_date: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="artist-birth"
                    className="text-sm text-muted-foreground"
                  >
                    Data de Nascimento
                  </label>
                </div>
              </div>
            </div>
            {filteredArtists.length > 0 ? (
              <div className="border border-muted-foreground/20 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/20">
                      {visibleArtistColumns.id && (
                        <TableHead className="min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            <span>ID</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.name && (
                        <TableHead className="min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            <span>Nome</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.email && (
                        <TableHead className="min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            <span>Email</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.role && (
                        <TableHead className="min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            <span>Tipo</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.area_of_expertise && (
                        <TableHead className="min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span>Área de Atuação</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.birth_date && (
                        <TableHead className="min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span>Data de Nascimento</span>
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="min-w-[100px]">
                        <span>Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredArtists.map((artist) => (
                      <TableRow key={artist.id} className="hover:bg-muted/20">
                        {visibleArtistColumns.id && (
                          <TableCell>{artist.id}</TableCell>
                        )}
                        {visibleArtistColumns.name && (
                          <TableCell>{artist.name}</TableCell>
                        )}
                        {visibleArtistColumns.email && (
                          <TableCell>
                            {artist.email || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        {visibleArtistColumns.role && (
                          <TableCell>
                            {artist.role === "artist" ? "Artista" : "Grupo"}
                          </TableCell>
                        )}
                        {visibleArtistColumns.area_of_expertise && (
                          <TableCell>
                            {artist.area_of_expertise || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        {visibleArtistColumns.birth_date && (
                          <TableCell>
                            {artist.birth_date ? (
                              new Date(artist.birth_date).toLocaleDateString(
                                "pt-BR"
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/users/?id=${artist.id}`)
                            }
                            className="text-primary hover:bg-primary/10"
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Nenhum artista encontrado.
              </p>
            )}
          </div>

          {/* Seção de Eventos */}
          <div className="bg-muted shadow-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              Eventos
            </h2>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Filtros
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Data (Início)
                  </label>
                  <Input
                    type="date"
                    value={eventDateStartFilter}
                    onChange={(e) => setEventDateStartFilter(e.target.value)}
                    className="w-full border-muted-foreground/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Data (Fim)
                  </label>
                  <Input
                    type="date"
                    value={eventDateEndFilter}
                    onChange={(e) => setEventDateEndFilter(e.target.value)}
                    className="w-full border-muted-foreground/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Status de Pagamento
                  </label>
                  <Select
                    value={eventPaymentFilter}
                    onValueChange={(value: "all" | "paid" | "pending") =>
                      setEventPaymentFilter(value)
                    }
                  >
                    <SelectTrigger className="w-full border-muted-foreground/20">
                      <SelectValue placeholder="Status de Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Público-Alvo
                  </label>
                  <Select
                    value={eventTargetAudienceFilter}
                    onValueChange={(
                      value: "all" | "Geral" | "Infantil" | "Adulto"
                    ) => setEventTargetAudienceFilter(value)}
                  >
                    <SelectTrigger className="w-full border-muted-foreground/20">
                      <SelectValue placeholder="Público-Alvo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Geral">Geral</SelectItem>
                      <SelectItem value="Infantil">Infantil</SelectItem>
                      <SelectItem value="Adulto">Adulto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Selecionar Colunas Visíveis
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-id"
                    checked={visibleEventColumns.id}
                    onCheckedChange={(checked) =>
                      setVisibleEventColumns((prev) => ({
                        ...prev,
                        id: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="event-id"
                    className="text-sm text-muted-foreground"
                  >
                    ID
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-title"
                    checked={visibleEventColumns.title}
                    onCheckedChange={(checked) =>
                      setVisibleEventColumns((prev) => ({
                        ...prev,
                        title: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="event-title"
                    className="text-sm text-muted-foreground"
                  >
                    Título
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-date"
                    checked={visibleEventColumns.date}
                    onCheckedChange={(checked) =>
                      setVisibleEventColumns((prev) => ({
                        ...prev,
                        date: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="event-date"
                    className="text-sm text-muted-foreground"
                  >
                    Data
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-location"
                    checked={visibleEventColumns.location}
                    onCheckedChange={(checked) =>
                      setVisibleEventColumns((prev) => ({
                        ...prev,
                        location: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="event-location"
                    className="text-sm text-muted-foreground"
                  >
                    Local
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-target-audience"
                    checked={visibleEventColumns.target_audience}
                    onCheckedChange={(checked) =>
                      setVisibleEventColumns((prev) => ({
                        ...prev,
                        target_audience: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="event-target-audience"
                    className="text-sm text-muted-foreground"
                  >
                    Público-Alvo
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="event-artists"
                    checked={visibleEventColumns.artists}
                    onCheckedChange={(checked) =>
                      setVisibleEventColumns((prev) => ({
                        ...prev,
                        artists: checked as boolean,
                      }))
                    }
                  />
                  <label
                    htmlFor="event-artists"
                    className="text-sm text-muted-foreground"
                  >
                    Artistas
                  </label>
                </div>
              </div>
            </div>
            {currentEvents.length > 0 ? (
              <div className="border border-muted-foreground/20 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/20">
                      {visibleEventColumns.id && (
                        <TableHead className="min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span>ID</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.title && (
                        <TableHead className="min-w-[150px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSortColumn("title");
                              setSortDirection(
                                sortColumn === "title" &&
                                  sortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <FileText className="w-5 h-5 text-primary" />
                            <span>Título</span>
                            {sortColumn === "title" && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.date && (
                        <TableHead className="min-w-[120px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSortColumn("date");
                              setSortDirection(
                                sortColumn === "date" && sortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <Calendar className="w-5 h-5 text-primary" />
                            <span>Data</span>
                            {sortColumn === "date" && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.location && (
                        <TableHead className="min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            <span>Local</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.target_audience && (
                        <TableHead className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            <span>Público-Alvo</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.artists && (
                        <TableHead className="min-w-[300px]">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            <span>Artistas</span>
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="min-w-[100px]">
                        <span>Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentEvents.map((event) => (
                      <TableRow key={event.id} className="hover:bg-muted/20">
                        {visibleEventColumns.id && (
                          <TableCell>{event.id}</TableCell>
                        )}
                        {visibleEventColumns.title && (
                          <TableCell>{event.title}</TableCell>
                        )}
                        {visibleEventColumns.date && (
                          <TableCell>
                            {new Date(event.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </TableCell>
                        )}
                        {visibleEventColumns.location && (
                          <TableCell>{event.location}</TableCell>
                        )}
                        {visibleEventColumns.target_audience && (
                          <TableCell>{event.target_audience}</TableCell>
                        )}
                        {visibleEventColumns.artists && (
                          <TableCell>
                            {event.artists.length > 0 ? (
                              <div className="space-y-1">
                                {event.artists.map((artist) => (
                                  <div
                                    key={artist.artist_id}
                                    className="grid grid-cols-[150px_100px_100px] gap-2 items-center"
                                  >
                                    {/* Nome do Artista */}
                                    <span className="truncate">
                                      {artist.artist_name}
                                    </span>

                                    {/* Quantia */}
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                                      R${" "}
                                      {artist.amount.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>

                                    {/* Status de Pagamento */}
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
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">
                                Nenhum artista
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/events/?id=${event.id}`)
                            }
                            className="text-primary hover:bg-primary/10"
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum evento encontrado.</p>
            )}
            {/* Controles de Paginação */}
            {filteredEvents.length > 0 && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Anterior
                </Button>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
