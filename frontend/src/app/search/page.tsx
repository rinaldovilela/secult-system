"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import Loading from "@/components/ui/loading";
import {
  Calendar,
  Mail,
  User,
  Users,
  ArrowLeft,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import { useDebounce } from "@/hooks/useDebounce";

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
  const itemsPerPage = 15;
  const debouncedQuery = useDebounce(query, 500);

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

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    const controller = new AbortController();

    try {
      const token = getToken();
      if (!token) {
        toast.error("Token não encontrado. Faça login novamente.");
        setTimeout(() => router.push("/login"), 0);
        return;
      }

      const params: Record<string, string | boolean | number> = {
        type: searchType,
        query: debouncedQuery,
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchType === "events" || searchType === "all") {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (pendingPayments) params.pendingPayments = pendingPayments;
      }

      const response = await axios.get<{
        results: SearchResult[];
        total: number;
      }>(`${BASE_URL}/api/search`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      // Remover duplicatas como camada extra de segurança
      const uniqueResults = Array.from(
        new Map(
          response.data.results.map((item) => [`${item.type}-${item.id}`, item])
        ).values()
      );

      setResults(uniqueResults);
      setTotalItems(response.data.total);
    } catch (error) {
      if (axios.isAxiosError(error) && error.name !== "CanceledError") {
        setResults([]);
        toast.error(
          `Erro na busca: ${error.response?.data?.error || error.message}`
        );
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
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                  aria-label="Buscar eventos e participantes"
                >
                  {isLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>

            {(searchType === "events" || searchType === "all") && (
              <div className="bg-muted/50 p-4 rounded-md shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  Filtros Adicionais
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="w-5 h-5 text-primary" />
                        Data Inicial
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Data inicial para filtro"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar className="w-5 h-5 text-primary" />
                        Data Final
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                        aria-label="Data final para filtro"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pendingPayments"
                      checked={pendingPayments}
                      onCheckedChange={(checked) =>
                        setPendingPayments(!!checked)
                      }
                    />
                    <label
                      htmlFor="pendingPayments"
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <DollarSign className="w-5 h-5 text-primary" />
                      Mostrar apenas eventos com pagamentos pendentes
                    </label>
                  </div>
                </div>
              </div>
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
          <div className="flex justify-center">
            <Loading />
          </div>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground text-center">
            Nenhum resultado encontrado
          </p>
        ) : (
          <>
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
