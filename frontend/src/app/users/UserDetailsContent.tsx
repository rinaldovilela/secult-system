// app/users/UserDetailsContent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import { Pencil, User, Mail, Phone } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
}

const BASE_URL = "http://localhost:5000";

export default function UserDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user, isAuthLoading } = useAuth();
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDetails = useCallback(async () => {
    if (!id) {
      toast({
        title: "❌ ID não fornecido",
        description: "Nenhum ID de usuário foi fornecido na URL.",
        variant: "destructive",
      });
      router.push("/search");
      return;
    }

    setIsLoading(true);
    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "❌ Token não encontrado",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserDetails(response.data);
    } catch (error) {
      let errorMessage = "Ocorreu um erro inesperado";
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          errorMessage = "Usuário não encontrado.";
        } else if (error.response?.status === 401) {
          errorMessage = "Sessão expirada. Faça login novamente.";
          router.push("/login");
        } else {
          errorMessage = error.response?.data?.error || error.message;
        }
      }
      toast({
        title: "❌ Erro ao buscar detalhes do usuário",
        description: errorMessage,
        variant: "destructive",
      });
      router.push("/search");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchUserDetails();
    }
  }, [isAuthLoading, user, fetchUserDetails]);

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }
  if (!userDetails) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Detalhes do Usuário - {userDetails.name}
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push(`/users/edit?id=${id}`)} // Ajustado para usar query params
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Pencil className="w-4 h-4" />
              <span>Editar</span>
            </Button>
            <Button variant="outline" onClick={() => router.push("/search")}>
              Voltar
            </Button>
          </div>
        </div>

        {/* Informações do Usuário */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Informações do Usuário</h2>
          <Separator className="my-4" />
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-5 h-5 text-indigo-600" />
              <span>
                <strong>Nome:</strong> {userDetails.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-5 h-5 text-indigo-600" />
              <span>
                <strong>Email:</strong> {userDetails.email}
              </span>
            </div>
            {userDetails.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-5 h-5 text-indigo-600" />
                <span>
                  <strong>Telefone:</strong> {userDetails.phone}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                <strong>Função:</strong>{" "}
                {userDetails.role.charAt(0).toUpperCase() +
                  userDetails.role.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                <strong>Criado em:</strong>{" "}
                {formatDateTime(userDetails.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
