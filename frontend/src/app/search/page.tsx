"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import Link from "next/link";
import Loading from "@/components/ui/loading";
import {
  Calendar,
  Mail,
  User,
  Users,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SkeletonResultItem } from "@/components/search/SkeletonResultItem";

interface BaseResult {
  id: string;
  name: string;
}

interface EventResult extends BaseResult {
  type: "event";
  title: string;
  date: string;
}

interface UserResult extends BaseResult {
  type: "user";
  email: string;
  role: string;
}

type SearchResult = EventResult | UserResult;
type SearchType = "all" | "events" | "users";

export default function Search() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pendingPayments, setPendingPayments] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState<"name" | "date" | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [cache, setCache] = useState<
    Record<string, { results: SearchResult[]; total: number }>
  >({});
  const itemsPerPage = 10;
  const debouncedQuery = useDebounce(query, 500);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const isAdminOrSecretary = ["admin", "secretary"].includes(user?.role || "");

  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast.error("Acesso não autorizado. Você precisa estar logado.");
      router.push("/login");
    } else if (user && !["admin", "secretary"].includes(user.role)) {
      toast.error(
        "Permissão insuficiente. Apenas admins e secretários podem acessar."
      );
      router.push("/");
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    const controller = new AbortController();

    // Validação de intervalo de datas
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        toast.error("A data final deve ser posterior à data inicial.");
        setIsLoading(false);
        return;
      }
    }

    // Criar chave de cache com base nos parâmetros
    const cacheKey = JSON.stringify({
      type: searchType,
      query: debouncedQuery,
      startDate,
      endDate,
      pendingPayments,
      page: currentPage,
      limit: itemsPerPage,
      sortBy,
      sortDirection,
    });

    // Verificar se o resultado está no cache
    if (cache[cacheKey]) {
      setResults(cache[cacheKey].results);
      setTotalItems(cache[cacheKey].total);
      setIsLoading(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast.error("Token não encontrado. Faça login novamente.");
        setTimeout(() => router.push("/login"), 0);
        return;
      }

      const response = await axios.get<{
        results: SearchResult[];
        total: number;
      }>(`${BASE_URL}/api/search`, {
        params: {
          type: searchType,
          query: debouncedQuery,
          startDate,
          endDate,
          pendingPayments,
          page: currentPage,
          limit: itemsPerPage,
          sortBy,
          sortDirection,
        },
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      // Verificar se response.data existe e tem a estrutura esperada
      if (!response.data || typeof response.data !== "object") {
        throw new Error("Resposta inválida da API");
      }

      const { results = [], total = 0 } = response.data; // Valores padrão para evitar erros

      const uniqueResults = Array.from(
        new Map(
          results.map((item) => [`${item.type}-${item.id}`, item])
        ).values()
      );

      // Armazenar no cache
      setCache((prev) => ({
        ...prev,
        [cacheKey]: { results: uniqueResults, total },
      }));

      setResults(uniqueResults);
      setTotalItems(total);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Logar detalhes do erro para depuração
        console.error("Erro na requisição à API:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });

        // Mostrar mensagem de erro para o usuário
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "Erro ao buscar dados. Tente novamente.";
        toast.error(`Erro na busca: ${errorMessage}`);

        // Definir valores padrão para evitar falhas na UI
        setResults([]);
        setTotalItems(0);
      } else {
        // Erro genérico (não relacionado ao axios)
        console.error("Erro inesperado:", error);
        toast.error("Erro inesperado. Tente novamente.");
        setResults([]);
        setTotalItems(0);
      }
    } finally {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [
    debouncedQuery,
    searchType,
    startDate,
    endDate,
    pendingPayments,
    currentPage,
    sortBy,
    sortDirection,
    router,
    BASE_URL,
  ]);

  useEffect(() => {
    handleSearch();
  }, [
    debouncedQuery,
    searchType,
    startDate,
    endDate,
    pendingPayments,
    currentPage,
    sortBy,
    sortDirection,
    handleSearch,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isAuthLoading) return <Loading />;

  const ResultItem = ({ result }: { result: SearchResult }) => {
    return (
      <div className="bg-background shadow-md rounded-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in duration-500">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {result.type === "event"
              ? result.title || "Evento sem título"
              : result.name || "Usuário sem nome"}
            <span className="text-sm text-muted-foreground ml-2">
              (
              {result.type === "event"
                ? "Evento"
                : result.role === "group"
                ? "Grupo Cultural"
                : "Artista"}
              )
            </span>
          </h2>

          {result.type === "user" ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email: {result.email}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                {result.role === "group" ? (
                  <Users className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
                Tipo: {result.role === "artist" ? "Artista" : "Grupo Cultural"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Data:{" "}
                {new Date(result.date).toLocaleString("pt-BR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Link
            href={`/${result.type === "event" ? "events" : "users"}?id=${
              result.id
            }`}
          >
            <Button
              variant="outline"
              className="w-full border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 transition-all duration-300 active:scale-95"
              aria-label={`Ver detalhes de ${
                result.type === "event" ? result.title : result.name
              }`}
            >
              Ver Detalhes
            </Button>
          </Link>
          {isAdminOrSecretary && (
            <Link
              href={`/${result.type === "event" ? "events" : "users"}/edit?id=${
                result.id
              }`}
            >
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                aria-label={`Editar ${
                  result.type === "event" ? result.title : result.name
                }`}
              >
                Editar
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Busca de Eventos e Participantes
          </h1>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 transition-all duration-300 active:scale-95"
            aria-label="Voltar para o dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="bg-muted shadow-lg rounded-lg p-6 sm:p-8 mb-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground">
                  Tipo de Busca
                </label>
                <Select
                  defaultValue="all" // Garantir valor inicial
                  value={searchType}
                  onValueChange={(value: SearchType) => setSearchType(value)}
                >
                  <SelectTrigger className="mt-1 w-full sm:w-40 rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300">
                    <SelectValue placeholder="Tipo de busca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tudo</SelectItem>
                    <SelectItem value="events">Eventos</SelectItem>
                    <SelectItem value="users">Participantes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-muted-foreground">
                  Termo de Busca
                </label>
                <Input
                  type="text"
                  placeholder="Digite o nome, email ou data..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                  aria-label="Digite o termo de busca"
                  ref={searchInputRef}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                  aria-label="Buscar eventos e participantes"
                >
                  {isLoading ? "Buscando..." : "Buscar"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchType("all");
                    setQuery("");
                    setStartDate("");
                    setEndDate("");
                    setPendingPayments(false);
                    setCurrentPage(1);
                    setSortBy("");
                    setSortDirection("asc");
                  }}
                  className="w-full sm:w-auto border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 transition-all duration-300 active:scale-95"
                  aria-label="Limpar filtros de busca"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            {(searchType === "events" || searchType === "all") && (
              <SearchFilters
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                pendingPayments={pendingPayments}
                setPendingPayments={setPendingPayments}
              />
            )}

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                Dicas para facilitar sua busca:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Busque por nome, email (participantes) ou data (eventos)
                </li>
                <li>
                  Deixe o termo em branco para listar tudo a partir de hoje
                </li>
                <li>Use os filtros para refinar os resultados</li>
              </ul>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {/* Renderizar 3 SkeletonResultItem para simular carregamento */}
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonResultItem key={index} />
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground text-center">
            Nenhum resultado encontrado
          </p>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <Select
                value={sortBy}
                onValueChange={(value: "name" | "date" | "none") => {
                  setSortBy(value === "none" ? "" : value);
                  setSortDirection("asc");
                }}
              >
                <SelectTrigger className="w-[180px] rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem ordenação</SelectItem>
                  {searchType !== "users" && (
                    <SelectItem value="date">Data</SelectItem>
                  )}
                  {searchType !== "events" && (
                    <SelectItem value="name">Nome</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {sortBy && (
                <Button
                  variant="outline"
                  className="ml-2 bg-muted/90 border-muted-foreground/20 text-muted-foreground hover:bg-muted/100 transition-all duration-300 active:scale-95"
                  onClick={() =>
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                  }
                  aria-label={`Ordenar em ordem ${
                    sortDirection === "asc" ? "descendente" : "ascendente"
                  }`}
                >
                  {sortDirection === "asc" ? "↑" : "↓"}
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {results.map((result) => (
                <ResultItem
                  key={`${result.type}-${result.id}`}
                  result={result}
                />
              ))}
            </div>
            <div className="flex justify-between items-center mt-6">
              <Button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                variant="outline"
                className="border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 transition-all duration-300 active:scale-95"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <span className="text-muted-foreground">
                Página {currentPage} de {totalPages} (Total: {totalItems} itens)
              </span>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                variant="outline"
                className="border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 transition-all duration-300 active:scale-95"
                aria-label="Próxima página"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
