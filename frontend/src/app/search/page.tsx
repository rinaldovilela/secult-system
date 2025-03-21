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
    <div>
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Busca de Eventos e Usuários
      </h1>
      <div className="mb-6">
        <p className="text-neutral-600 mb-4">
          Use a busca para encontrar eventos, artistas ou grupos culturais.
        </p>
        <div className="flex gap-4 mb-4">
          <Select
            onValueChange={(value) =>
              setSearchType(value as "all" | "events" | "users")
            }
            value={searchType}
          >
            <SelectTrigger className="w-40">
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
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        <div className="text-sm text-neutral-600">
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
        <p className="text-neutral-600">Nenhum resultado encontrado.</p>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="p-4 bg-white shadow-md rounded-lg flex justify-between items-center"
            >
              <div>
                <h2 className="text-lg font-semibold">
                  {result.name} (
                  {result.type === "event" ? "Evento" : "Usuário"})
                </h2>
                {result.type === "user" && (
                  <p className="text-sm text-neutral-600">
                    Email: {result.email} | Tipo: {result.role}
                  </p>
                )}
                {result.type === "event" && (
                  <p className="text-sm text-neutral-600">
                    Data: {result.date}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/${result.type === "event" ? "events" : "users"}/${
                    result.id
                  }`}
                >
                  <Button variant="outline">Ver Detalhes</Button>
                </Link>
                {isAdminOrSecretary && (
                  <Link
                    href={`/${result.type === "event" ? "events" : "users"}/${
                      result.id
                    }/edit`}
                  >
                    <Button>Editar</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
