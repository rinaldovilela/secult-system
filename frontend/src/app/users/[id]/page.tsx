"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import {
  User,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Video,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";

const BASE_URL = "http://localhost:5000";

interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: "artist" | "group";
  cpf_cnpj?: string;
  bio?: string;
  area_of_expertise?: string;
  birth_date?: string;
  address?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
  bank_details?: {
    bank_name?: string;
    account_type?: "corrente" | "poupanca";
    agency?: string;
    account_number?: string;
    pix_key?: string;
  };
  profile_picture?: string;
  portfolio?: string;
  video?: string;
  related_files?: string;
}

export default function UserDetails() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthLoading } = useAuth();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserDetails = async () => {
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
  };

  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchUserDetails();
    }
  }, [isAuthLoading, user]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Não informado";
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Data inválida";
    }
  };

  const formatCpfCnpj = (value?: string) => {
    if (!value) return "Não informado";

    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length === 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (cleanValue.length === 14) {
      return cleanValue.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    return value;
  };

  const formatCep = (cep?: string) => {
    if (!cep) return "Não informado";
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      return cleanCep.replace(/(\d{5})(\d{3})/, "$1-$2");
    }
    return cep;
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }
  if (!userDetails) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Detalhes do{" "}
            {userDetails.role === "artist" ? "Artista" : "Grupo Cultural"}
          </h1>

          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Dados Pessoais</h2>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <p>
                <strong>Nome:</strong> {userDetails.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <p>
                <strong>Email:</strong> {userDetails.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <p>
                <strong>
                  {userDetails.role === "artist" ? "CPF" : "CNPJ"}:
                </strong>{" "}
                {formatCpfCnpj(userDetails.cpf_cnpj)}
              </p>
            </div>
            {userDetails.bio && (
              <div>
                <p>
                  <strong>Biografia:</strong> {userDetails.bio}
                </p>
              </div>
            )}
            {userDetails.area_of_expertise && (
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <p>
                  <strong>Área de Atuação:</strong>{" "}
                  {userDetails.area_of_expertise}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <p>
                <strong>Data de Nascimento:</strong>{" "}
                {formatDate(userDetails.birth_date)}
              </p>
            </div>
          </div>

          {/* Endereço */}
          {userDetails.address && (
            <div className="bg-gray-50 p-6 rounded-lg space-y-4 mt-6">
              <h2 className="text-xl font-semibold">Endereço</h2>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <p>
                  <strong>CEP:</strong> {formatCep(userDetails.address.cep)}
                </p>
              </div>
              <p>
                <strong>Logradouro:</strong>{" "}
                {userDetails.address.logradouro || "Não informado"}
              </p>
              <p>
                <strong>Número:</strong>{" "}
                {userDetails.address.numero || "Não informado"}
              </p>
              {userDetails.address.complemento && (
                <p>
                  <strong>Complemento:</strong>{" "}
                  {userDetails.address.complemento}
                </p>
              )}
              <p>
                <strong>Bairro:</strong>{" "}
                {userDetails.address.bairro || "Não informado"}
              </p>
              <p>
                <strong>Cidade:</strong>{" "}
                {userDetails.address.cidade || "Não informado"}
              </p>
              <p>
                <strong>Estado:</strong>{" "}
                {userDetails.address.estado || "Não informado"}
              </p>
            </div>
          )}

          {/* Dados Bancários */}
          {userDetails.bank_details && (
            <div className="bg-gray-50 p-6 rounded-lg space-y-4 mt-6">
              <h2 className="text-xl font-semibold">Dados Bancários</h2>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <p>
                  <strong>Banco:</strong>{" "}
                  {userDetails.bank_details.bank_name || "Não informado"}
                </p>
              </div>
              <p>
                <strong>Tipo de Conta:</strong>{" "}
                {userDetails.bank_details.account_type === "poupanca"
                  ? "Conta Poupança"
                  : "Conta Corrente"}
              </p>
              <p>
                <strong>Agência:</strong>{" "}
                {userDetails.bank_details.agency || "Não informado"}
              </p>
              <p>
                <strong>Número da Conta:</strong>{" "}
                {userDetails.bank_details.account_number || "Não informado"}
              </p>
              {userDetails.bank_details.pix_key && (
                <p>
                  <strong>Chave PIX:</strong> {userDetails.bank_details.pix_key}
                </p>
              )}
            </div>
          )}

          {/* Mídias e Arquivos */}
          <div className="bg-gray-50 p-6 rounded-lg space-y-4 mt-6">
            <h2 className="text-xl font-semibold">Mídias e Arquivos</h2>
            {userDetails.profile_picture && (
              <div>
                <p>
                  <strong>Foto de Perfil:</strong>
                </p>
                <div className="mt-2 h-24 w-24 sm:h-32 sm:w-32 relative">
                  <Image
                    src={`${BASE_URL}${userDetails.profile_picture}`}
                    alt="Foto de perfil"
                    fill
                    className="object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      toast({
                        title: "Erro ao carregar imagem",
                        description: "A foto de perfil não pôde ser carregada.",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              </div>
            )}
            {userDetails.portfolio && (
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <p>
                  <strong>Portfólio:</strong>{" "}
                  <a
                    href={`${BASE_URL}${userDetails.portfolio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Visualizar Portfólio
                  </a>
                </p>
              </div>
            )}
            {userDetails.video && (
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-600" />
                <p>
                  <strong>Vídeo:</strong>{" "}
                  <a
                    href={`${BASE_URL}${userDetails.video}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Visualizar Vídeo
                  </a>
                </p>
              </div>
            )}
            {userDetails.related_files && (
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <p>
                  <strong>Arquivos Relacionados:</strong>{" "}
                  <a
                    href={`${BASE_URL}${userDetails.related_files}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    Visualizar Arquivos
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Botão Voltar */}
          <div className="mt-6">
            <Button variant="outline" onClick={() => router.push("/search")}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
