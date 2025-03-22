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
import Link from "next/link";
import Loading from "@/components/ui/loading";
import { Calendar, Mail, User } from "lucide-react";

type SearchResult = {
  type: "event" | "user";
  id: number;
  name: string;
  email?: string;
  date?: string;
  role?: string;
};

export default function Search() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [searchType, setSearchType] = useState<"all" | "events" | "users">(
    "all"
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/search", {
        params: { type: searchType, query },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setResults(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao buscar: ${error.response?.data?.error || error.message}`
        );
      } else {
        toast.error(`Erro ao buscar: ${String(error)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return <Loading />;
  if (!user) {
    router.push("/login");
    return null;
  }

  const isAdminOrSecretary = ["admin", "secretary"].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Busca de Eventos e Usuários
        </h1>
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8 mb-6">
          <p className="text-gray-600 mb-4">
            Use a busca para encontrar eventos, artistas ou grupos culturais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select
              onValueChange={(value) =>
                setSearchType(value as "all" | "events" | "users")
              }
              value={searchType}
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
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            <p>
              <strong>Dicas para facilitar sua busca:</strong>
            </p>
            <ul className="list-disc pl-5">
              <li>
                Busque por nome, email (para usuários) ou data (para eventos).
              </li>
              <li>Selecione o tipo de busca para filtrar os resultados.</li>
            </ul>
          </div>
        </div>
        {results.length === 0 ? (
          <p className="text-gray-600 text-center">
            Nenhum resultado encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="bg-white shadow-md rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {result.name}{" "}
                    <span className="text-sm text-gray-500">
                      ({result.type === "event" ? "Evento" : "Usuário"})
                    </span>
                  </h2>
                  {result.type === "user" && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-indigo-600" />
                        Email: {result.email}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        Tipo:{" "}
                        {result.role === "artist"
                          ? "Artista"
                          : "Grupo Cultural"}
                      </p>
                    </div>
                  )}
                  {result.type === "event" && (
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Data:{" "}
                      {new Date(result.date!).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Link
                    href={`/${result.type === "event" ? "events" : "users"}/${
                      result.id
                    }`}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
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
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                        Editar
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
