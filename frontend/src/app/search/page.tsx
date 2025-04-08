"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
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
import { Calendar, Mail, User } from "lucide-react";
import { getToken } from "@/lib/auth";
import { useDebounce } from "@/hooks/useDebounce";

interface BaseResult {
  id: string;
  name: string;
}

interface EventResult extends BaseResult {
  type: "event";
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  const isAdminOrSecretary = ["admin", "secretary"].includes(user?.role || "");

  useEffect(() => {
    if (!isAuthLoading && !user) {
      toast({
        title: "Acesso não autorizado",
        description: "Você precisa estar logado para acessar esta página.",
        variant: "destructive",
      });
      router.push("/login");
    } else if (user && !["admin", "secretary"].includes(user.role)) {
      toast({
        title: "Permissão insuficiente",
        description:
          "Apenas administradores e secretários podem acessar esta página.",
        variant: "destructive",
      });
      router.push("/dashboard");
    }
  }, [isAuthLoading, user, router]);

  const handleSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "Token não encontrado",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        setTimeout(() => router.push("/login"), 0);
        return;
      }

      const response = await axios.get<SearchResult[]>(
        "http://localhost:5000/api/search",
        {
          params: { type: searchType, query: debouncedQuery },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }
      );
      setResults(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.name !== "CanceledError") {
        setResults([]);
        toast({
          title: "Erro na busca",
          description: error.response?.data?.error || error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }

    return () => controller.abort();
  }, [debouncedQuery, searchType, router]);

  useEffect(() => {
    handleSearch();
  }, [debouncedQuery, searchType, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (isAuthLoading) return <Loading />;

  const ResultItem = ({ result }: { result: SearchResult }) => (
    <div className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">
          {result.name}{" "}
          <span className="text-sm text-gray-500">
            ({result.type === "event" ? "Evento" : "Usuário"})
          </span>
        </h2>

        {result.type === "user" ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Email: {result.email}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Tipo: {result.role === "artist" ? "Artista" : "Grupo Cultural"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Data: {new Date(result.date).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Link
          href={`/${result.type === "event" ? "events" : "users"}/${result.id}`}
          className="w-full sm:w-auto"
        >
          <Button variant="outline" className="w-full">
            Ver Detalhes
          </Button>
        </Link>
        {isAdminOrSecretary && (
          <Link
            href={`/${result.type === "event" ? "events" : "users"}/${
              result.id
            }/edit`}
            className="w-full sm:w-auto"
          >
            <Button className="w-full">Editar</Button>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Busca de Eventos e Usuários
        </h1>

        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select
              value={searchType}
              onValueChange={(value: SearchType) => setSearchType(value)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tipo de busca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="events">Eventos</SelectItem>
                <SelectItem value="users">Usuários</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="text"
              placeholder="Digite o nome, email ou data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />

            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Dicas para facilitar sua busca:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Busque por nome, email (usuários) ou data (eventos)</li>
              <li>Pressione Enter para buscar</li>
              <li>Selecione o tipo para filtrar resultados</li>
            </ul>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loading />
          </div>
        ) : results.length === 0 ? (
          <p className="text-gray-600 text-center">
            {query ? "Nenhum resultado encontrado" : "Digite para buscar"}
          </p>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <ResultItem key={`${result.type}-${result.id}`} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
