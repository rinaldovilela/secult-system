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
  Clock,
  Banknote,
  FileDigit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const BASE_URL = "http://localhost:5000";

interface UserDetails {
  id: string;
  name: string;
  email: string;
  role: "admin" | "secretary" | "artist" | "organizer" | "group";
  cpf_cnpj?: string;
  bio?: string;
  area_of_expertise?: string;
  birth_date?: string;
  created_at?: string;
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
    account_type?: string;
    agency?: string;
    account_number?: string;
    pix_key?: string;
    account_holder_name?: string;
    account_holder_document?: string;
    account_holder_type?: string;
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

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Não informado";
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

  const getRoleBadge = (role?: string) => {
    if (!role) return null;

    const roleMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      admin: { label: "Administrador", variant: "destructive" },
      secretary: { label: "Secretário", variant: "secondary" },
      artist: { label: "Artista", variant: "default" },
      group: { label: "Grupo Cultural", variant: "default" },
      organizer: { label: "Organizador", variant: "outline" },
    };

    const roleInfo = roleMap[role] || { label: role, variant: "outline" };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const downloadFile = (
    base64Data: string,
    fileName: string,
    mimeType: string
  ) => {
    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${base64Data}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }
  if (!userDetails) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Detalhes do Usuário
          </h1>
          <Button variant="outline" onClick={() => router.push("/search")}>
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna esquerda - Informações básicas */}
          <div className="lg:col-span-1 space-y-6">
            {/* Seção de perfil */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Perfil</h2>
              <Separator className="my-4" />
              {userDetails.profile_picture && (
                <div className="flex justify-center mb-4">
                  <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-gray-200">
                    <Image
                      src={`data:image/jpeg;base64,${userDetails.profile_picture}`}
                      alt="Foto de perfil"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        toast({
                          title: "Erro ao carregar imagem",
                          description:
                            "A foto de perfil não pôde ser carregada.",
                          variant: "destructive",
                        });
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{userDetails.name}</h3>
                  {getRoleBadge(userDetails.role)}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{userDetails.email}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileDigit className="w-4 h-4" />
                  <span>{formatCpfCnpj(userDetails.cpf_cnpj)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    Cadastrado em: {formatDateTime(userDetails.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações profissionais */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                Informações Profissionais
              </h2>
              <Separator className="my-4" />
              <div className="space-y-4">
                {userDetails.area_of_expertise && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Área de Atuação
                    </h4>
                    <p>{userDetails.area_of_expertise}</p>
                  </div>
                )}

                {userDetails.bio && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Biografia
                    </h4>
                    <p className="whitespace-pre-line">{userDetails.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna direita - Detalhes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endereço */}
            {userDetails.address && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>Endereço</span>
                </h2>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">CEP</h4>
                    <p>{formatCep(userDetails.address.cep)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Logradouro
                    </h4>
                    <p>{userDetails.address.logradouro || "Não informado"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Número
                    </h4>
                    <p>{userDetails.address.numero || "Não informado"}</p>
                  </div>
                  {userDetails.address.complemento && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Complemento
                      </h4>
                      <p>{userDetails.address.complemento}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Bairro
                    </h4>
                    <p>{userDetails.address.bairro || "Não informado"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Cidade
                    </h4>
                    <p>{userDetails.address.cidade || "Não informado"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Estado
                    </h4>
                    <p>{userDetails.address.estado || "Não informado"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Dados bancários */}
            {userDetails.bank_details && (
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Dados Bancários</span>
                </h2>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Banco</h4>
                    <p>
                      {userDetails.bank_details.bank_name || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Tipo de Conta
                    </h4>
                    <p>
                      {userDetails.bank_details.account_type === "poupanca"
                        ? "Conta Poupança"
                        : "Conta Corrente"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Agência
                    </h4>
                    <p>{userDetails.bank_details.agency || "Não informado"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Número da Conta
                    </h4>
                    <p>
                      {userDetails.bank_details.account_number ||
                        "Não informado"}
                    </p>
                  </div>
                  {userDetails.bank_details.pix_key && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">
                        Chave PIX
                      </h4>
                      <p>{userDetails.bank_details.pix_key}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Titular da Conta
                    </h4>
                    <p>
                      {userDetails.bank_details.account_holder_name ||
                        userDetails.name}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Documento do Titular
                    </h4>
                    <p>
                      {formatCpfCnpj(
                        userDetails.bank_details.account_holder_document
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Tipo de Titular
                    </h4>
                    <p>
                      {userDetails.bank_details.account_holder_type ===
                      "individual"
                        ? "Pessoa Física"
                        : "Pessoa Jurídica"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Arquivos e mídias */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Arquivos e Mídias</h2>
              <Separator className="my-4" />
              <div className="space-y-4">
                {(userDetails.portfolio ||
                  userDetails.video ||
                  userDetails.related_files) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userDetails.portfolio && (
                      <div className="border rounded-lg p-4 flex flex-col items-center">
                        <FileText className="w-8 h-8 text-indigo-600 mb-2" />
                        <p className="text-sm font-medium mb-2">Portfólio</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              userDetails.portfolio!,
                              `portfolio-${userDetails.name}.pdf`,
                              "application/pdf"
                            )
                          }
                        >
                          Baixar
                        </Button>
                      </div>
                    )}

                    {userDetails.video && (
                      <div className="border rounded-lg p-4 flex flex-col items-center">
                        <Video className="w-8 h-8 text-indigo-600 mb-2" />
                        <p className="text-sm font-medium mb-2">Vídeo</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              userDetails.video!,
                              `video-${userDetails.name}.mp4`,
                              "video/mp4"
                            )
                          }
                        >
                          Baixar
                        </Button>
                      </div>
                    )}

                    {userDetails.related_files && (
                      <div className="border rounded-lg p-4 flex flex-col items-center">
                        <FileText className="w-8 h-8 text-indigo-600 mb-2" />
                        <p className="text-sm font-medium mb-2">Documentos</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              userDetails.related_files!,
                              `documentos-${userDetails.name}.zip`,
                              "application/zip"
                            )
                          }
                        >
                          Baixar
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {!userDetails.portfolio &&
                  !userDetails.video &&
                  !userDetails.related_files && (
                    <p className="text-sm text-gray-500">
                      Nenhum arquivo enviado
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
