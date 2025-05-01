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
import { Skeleton } from "@/components/ui/skeleton";
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
  email?: string;
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
  const [eventSearch, setEventSearch] = useState("");
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

  // Seleção de eventos
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

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

  // Paginação para eventos
  const [currentEventPage, setCurrentEventPage] = useState(1);

  // Paginação para artistas
  const [currentArtistPage, setCurrentArtistPage] = useState(1);

  // Quantidade de itens por página (compartilhado entre eventos e artistas)
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Ordenação para eventos
  const [sortColumn, setSortColumn] = useState<
    "id" | "title" | "date" | "location" | "target_audience" | "artists" | null
  >(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Ordenação para artistas
  const [artistSortColumn, setArtistSortColumn] = useState<
    "id" | "name" | "email" | "role" | "area_of_expertise" | "birth_date" | null
  >(null);
  const [artistSortDirection, setArtistSortDirection] = useState<
    "asc" | "desc"
  >("asc");

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

        setArtists(fetchedArtists);
        setFilteredArtists(fetchedArtists);
        setEvents(fetchedEvents);
        setFilteredEvents(fetchedEvents);

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

    if (eventSearch) {
      filtered = filtered.filter((event) =>
        event.title.toLowerCase().includes(eventSearch.toLowerCase())
      );
    }

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

    if (eventPaymentFilter !== "all") {
      filtered = filtered.filter((event) =>
        event.artists.some((artist) =>
          eventPaymentFilter === "paid" ? artist.is_paid : !artist.is_paid
        )
      );
    }

    if (eventTargetAudienceFilter !== "all") {
      filtered = filtered.filter(
        (event) => event.target_audience === eventTargetAudienceFilter
      );
    }

    if (sortColumn) {
      filtered.sort((a, b) => {
        let valueA: string | number;
        let valueB: string | number;

        if (sortColumn === "date") {
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
        } else if (sortColumn === "artists") {
          // Calcular o valor total pago por artista
          valueA = a.artists.reduce((sum, artist) => sum + artist.amount, 0);
          valueB = b.artists.reduce((sum, artist) => sum + artist.amount, 0);
        } else {
          valueA = a[sortColumn]?.toLowerCase() || "";
          valueB = b[sortColumn]?.toLowerCase() || "";
        }

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredEvents(filtered);
    setCurrentEventPage(1);
  }, [
    eventSearch,
    eventDateStartFilter,
    eventDateEndFilter,
    eventPaymentFilter,
    eventTargetAudienceFilter,
    sortColumn,
    sortDirection,
    events,
  ]);

  // Filtrar e ordenar artistas com base nos filtros
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

    if (artistSortColumn) {
      filtered.sort((a, b) => {
        let valueA: string | number;
        let valueB: string | number;

        if (artistSortColumn === "birth_date") {
          valueA = a.birth_date ? new Date(a.birth_date).getTime() : 0;
          valueB = b.birth_date ? new Date(b.birth_date).getTime() : 0;
        } else {
          valueA = a[artistSortColumn]?.toLowerCase() || "";
          valueB = b[artistSortColumn]?.toLowerCase() || "";
        }

        if (valueA < valueB) return artistSortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return artistSortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredArtists(filtered);
    setCurrentArtistPage(1);
  }, [
    artistSearch,
    artistTypeFilter,
    artistSortColumn,
    artistSortDirection,
    artists,
  ]);

  // Calcular artistas a serem exibidos na página atual
  const indexOfLastArtist = currentArtistPage * itemsPerPage;
  const indexOfFirstArtist = indexOfLastArtist - itemsPerPage;
  const currentArtists = filteredArtists.slice(
    indexOfFirstArtist,
    indexOfLastArtist
  );
  const totalArtistPages = Math.ceil(filteredArtists.length / itemsPerPage);

  // Calcular eventos a serem exibidos na página atual
  const indexOfLastEvent = currentEventPage * itemsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - itemsPerPage;
  const currentEvents = filteredEvents.slice(
    indexOfFirstEvent,
    indexOfLastEvent
  );
  const totalEventPages = Math.ceil(filteredEvents.length / itemsPerPage);

  // Função para alternar a seleção de eventos
  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  // Função para selecionar ou desmarcar todos os eventos
  const toggleSelectAllEvents = () => {
    if (selectedEvents.length === currentEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(currentEvents.map((event) => event.id));
    }
  };

  // Função para baixar o CSV dos eventos selecionados
  const downloadSelectedEventsCSV = () => {
    if (selectedEvents.length === 0) {
      toast({
        title: "Nenhum evento selecionado",
        description: "Selecione pelo menos um evento para exportar.",
        variant: "destructive",
      });
      return;
    }

    const escapeCSVField = (field: string | undefined) => {
      if (!field) return "";
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvContent: string[] = [];

    const eventHeaders = [];
    if (visibleEventColumns.id) eventHeaders.push("ID");
    if (visibleEventColumns.title) eventHeaders.push("Título");
    if (visibleEventColumns.date) eventHeaders.push("Data");
    if (visibleEventColumns.location) eventHeaders.push("Local");
    if (visibleEventColumns.target_audience) eventHeaders.push("Público-Alvo");
    if (visibleEventColumns.artists)
      eventHeaders.push("Artista", "Quantia (R$)", "Pago");

    const selectedEventsData = filteredEvents.filter((event) =>
      selectedEvents.includes(event.id)
    );

    const eventRows = selectedEventsData.flatMap((event) =>
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

    csvContent.push("Relatório de Eventos Selecionados");
    csvContent.push(eventHeaders.join(","));
    csvContent.push(...eventRows.map((row) => row.join(",")));

    const blob = new Blob([csvContent.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, `relatorio-eventos-selecionados.csv`);
  };

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

  if (isAuthLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="min-h-screen bg-background py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Seção de Resumo */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3"
              >
                <Skeleton className="w-8 h-8 rounded-full bg-muted-foreground/20" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-muted-foreground/20" />
                  <Skeleton className="h-6 w-16 bg-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">
                  Total de Eventos
                </p>
                <p className="text-xl font-bold text-foreground">
                  {summaryStats.totalEvents}
                </p>
              </div>
            </div>
            <div className="bg-muted shadow-sm rounded-lg p-4 flex items-center gap-3 hover:shadow-lg hover:scale-105 transition-all duration-300">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">
                  Total de Artistas
                </p>
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
        )}

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
              <div className="flex items-center gap-3 mt-4 sm:mt-0">
                <span className="text-sm text-muted-foreground">
                  Itens por página:
                </span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentArtistPage(1);
                    setCurrentEventPage(1);
                  }}
                >
                  <SelectTrigger className="w-24 border-muted-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
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
            {isLoading ? (
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
                    {Array.from({ length: itemsPerPage }).map((_, index) => (
                      <TableRow key={index}>
                        {visibleArtistColumns.id && (
                          <TableCell>
                            <Skeleton className="h-6 w-24 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleArtistColumns.name && (
                          <TableCell>
                            <Skeleton className="h-6 w-32 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleArtistColumns.email && (
                          <TableCell>
                            <Skeleton className="h-6 w-40 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleArtistColumns.role && (
                          <TableCell>
                            <Skeleton className="h-6 w-20 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleArtistColumns.area_of_expertise && (
                          <TableCell>
                            <Skeleton className="h-6 w-28 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleArtistColumns.birth_date && (
                          <TableCell>
                            <Skeleton className="h-6 w-24 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        <TableCell>
                          <Skeleton className="h-8 w-24 bg-muted-foreground/20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : currentArtists.length > 0 ? (
              <div className="border border-muted-foreground/20 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/20">
                      {visibleArtistColumns.id && (
                        <TableHead className="min-w-[100px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setArtistSortColumn("id");
                              setArtistSortDirection(
                                artistSortColumn === "id" &&
                                  artistSortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <User className="w-5 h-5 text-primary" />
                            <span>ID</span>
                            {artistSortColumn === "id" && (
                              <span>
                                {artistSortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.name && (
                        <TableHead className="min-w-[150px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setArtistSortColumn("name");
                              setArtistSortDirection(
                                artistSortColumn === "name" &&
                                  artistSortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <User className="w-5 h-5 text-primary" />
                            <span>Nome</span>
                            {artistSortColumn === "name" && (
                              <span>
                                {artistSortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.email && (
                        <TableHead className="min-w-[200px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setArtistSortColumn("email");
                              setArtistSortDirection(
                                artistSortColumn === "email" &&
                                  artistSortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <Mail className="w-5 h-5 text-primary" />
                            <span>Email</span>
                            {artistSortColumn === "email" && (
                              <span>
                                {artistSortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.role && (
                        <TableHead className="min-w-[100px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setArtistSortColumn("role");
                              setArtistSortDirection(
                                artistSortColumn === "role" &&
                                  artistSortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <Users className="w-5 h-5 text-primary" />
                            <span>Tipo</span>
                            {artistSortColumn === "role" && (
                              <span>
                                {artistSortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.area_of_expertise && (
                        <TableHead className="min-w-[150px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setArtistSortColumn("area_of_expertise");
                              setArtistSortDirection(
                                artistSortColumn === "area_of_expertise" &&
                                  artistSortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <FileText className="w-5 h-5 text-primary" />
                            <span>Área de Atuação</span>
                            {artistSortColumn === "area_of_expertise" && (
                              <span>
                                {artistSortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleArtistColumns.birth_date && (
                        <TableHead className="min-w-[150px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setArtistSortColumn("birth_date");
                              setArtistSortDirection(
                                artistSortColumn === "birth_date" &&
                                  artistSortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <Calendar className="w-5 h-5 text-primary" />
                            <span>Data de Nascimento</span>
                            {artistSortColumn === "birth_date" && (
                              <span>
                                {artistSortDirection === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="min-w-[100px]">
                        <span>Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentArtists.map((artist) => (
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
            {/* Controles de Paginação para Artistas */}
            {filteredArtists.length > 0 && !isLoading && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  disabled={currentArtistPage === 1}
                  onClick={() => setCurrentArtistPage((prev) => prev - 1)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Anterior
                </Button>
                <span>
                  Página {currentArtistPage} de {totalArtistPages}
                </span>
                <Button
                  disabled={currentArtistPage === totalArtistPages}
                  onClick={() => setCurrentArtistPage((prev) => prev + 1)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>

          {/* Seção de Eventos */}
          <div className="bg-muted shadow-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
              Eventos
            </h2>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Input
                  type="text"
                  placeholder="Buscar por nome do evento..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full sm:w-64 border-muted-foreground/20 focus:border-primary"
                />
              </div>
              <Button
                onClick={downloadSelectedEventsCSV}
                disabled={selectedEvents.length === 0}
                className="mt-4 sm:mt-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Eventos Selecionados (CSV)
              </Button>
            </div>
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
                    ) =>
                      setEventTargetAudienceFilter(
                        value as "all" | "Geral" | "Infantil" | "Adulto"
                      )
                    }
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
            {isLoading ? (
              <div className="border border-muted-foreground/20 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/20">
                      <TableHead className="min-w-[50px]">
                        <Checkbox disabled />
                      </TableHead>
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
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <span>Título</span>
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.date && (
                        <TableHead className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            <span>Data</span>
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
                    {Array.from({ length: itemsPerPage }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-6 w-6 bg-muted-foreground/20" />
                        </TableCell>
                        {visibleEventColumns.id && (
                          <TableCell>
                            <Skeleton className="h-6 w-24 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleEventColumns.title && (
                          <TableCell>
                            <Skeleton className="h-6 w-32 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleEventColumns.date && (
                          <TableCell>
                            <Skeleton className="h-6 w-24 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleEventColumns.location && (
                          <TableCell>
                            <Skeleton className="h-6 w-28 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleEventColumns.target_audience && (
                          <TableCell>
                            <Skeleton className="h-6 w-20 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        {visibleEventColumns.artists && (
                          <TableCell>
                            <Skeleton className="h-6 w-48 bg-muted-foreground/20" />
                          </TableCell>
                        )}
                        <TableCell>
                          <Skeleton className="h-8 w-24 bg-muted-foreground/20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : currentEvents.length > 0 ? (
              <div className="border border-muted-foreground/20 rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-muted/20">
                      <TableHead className="min-w-[50px]">
                        <Checkbox
                          checked={
                            selectedEvents.length === currentEvents.length
                          }
                          onCheckedChange={toggleSelectAllEvents}
                        />
                      </TableHead>
                      {visibleEventColumns.id && (
                        <TableHead className="min-w-[100px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSortColumn("id");
                              setSortDirection(
                                sortColumn === "id" && sortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <FileText className="w-5 h-5 text-primary" />
                            <span>ID</span>
                            {sortColumn === "id" && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
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
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSortColumn("location");
                              setSortDirection(
                                sortColumn === "location" &&
                                  sortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <MapPin className="w-5 h-5 text-primary" />
                            <span>Local</span>
                            {sortColumn === "location" && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.target_audience && (
                        <TableHead className="min-w-[120px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSortColumn("target_audience");
                              setSortDirection(
                                sortColumn === "target_audience" &&
                                  sortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <Users className="w-5 h-5 text-primary" />
                            <span>Público-Alvo</span>
                            {sortColumn === "target_audience" && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </div>
                        </TableHead>
                      )}
                      {visibleEventColumns.artists && (
                        <TableHead className="min-w-[300px]">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => {
                              setSortColumn("artists");
                              setSortDirection(
                                sortColumn === "artists" &&
                                  sortDirection === "asc"
                                  ? "desc"
                                  : "asc"
                              );
                            }}
                          >
                            <User className="w-5 h-5 text-primary" />
                            <span>Artistas</span>
                            {sortColumn === "artists" && (
                              <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
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
                        <TableCell>
                          <Checkbox
                            checked={selectedEvents.includes(event.id)}
                            onCheckedChange={() =>
                              toggleEventSelection(event.id)
                            }
                          />
                        </TableCell>
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
                                    <span className="truncate">
                                      {artist.artist_name}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                                      R${" "}
                                      {artist.amount.toLocaleString("pt-BR", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
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
            {/* Controles de Paginação para Eventos */}
            {filteredEvents.length > 0 && !isLoading && (
              <div className="flex justify-between items-center mt-4">
                <Button
                  disabled={currentEventPage === 1}
                  onClick={() => setCurrentEventPage((prev) => prev - 1)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Anterior
                </Button>
                <span>
                  Página {currentEventPage} de {totalEventPages}
                </span>
                <Button
                  disabled={currentEventPage === totalEventPages}
                  onClick={() => setCurrentEventPage((prev) => prev + 1)}
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
