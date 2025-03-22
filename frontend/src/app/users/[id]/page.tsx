"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import Link from "next/link";
import { Calendar, Mail, User, FileText, Video, Download } from "lucide-react";

type UserDetails = {
  id: number;
  name: string;
  email: string;
  role: string;
  bio: string | null;
  area_of_expertise: string | null;
  profile_picture: Buffer | string | null;
  portfolio: Buffer | string | null;
  video: Buffer | string | null;
  related_files: Buffer | string | null;
  created_at: string;
};

export default function UserDetails() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user || !["admin", "secretary"].includes(user.role)) {
      router.push("/login");
      return;
    }

    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:5000/api/users/details/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUserDetails(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar detalhes do usuário: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar detalhes do usuário: ${String(error)}`);
        }
        router.push("/search");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [id, user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  if (!userDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Usuário não encontrado.</p>
      </div>
    );
  }

  // Função para converter buffer em base64, se necessário
  const getProfilePictureSrc = (picture: Buffer | string | null) => {
    if (!picture) return null;
    if (typeof picture === "string") return picture;
    return `data:image/jpeg;base64,${Buffer.from(picture).toString("base64")}`;
  };

  const getPortfolioSrc = (portfolio: Buffer | string | null) => {
    if (!portfolio) return null;
    if (typeof portfolio === "string") return portfolio;
    return `data:application/pdf;base64,${Buffer.from(portfolio).toString(
      "base64"
    )}`;
  };

  const getVideoSrc = (video: Buffer | string | null) => {
    if (!video) return null;
    if (typeof video === "string") return video;
    return `data:video/mp4;base64,${Buffer.from(video).toString("base64")}`;
  };

  const getRelatedFilesSrc = (files: Buffer | string | null) => {
    if (!files) return null;
    if (typeof files === "string") return files;
    return `data:application/octet-stream;base64,${Buffer.from(files).toString(
      "base64"
    )}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-indigo-600 p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {userDetails.name}
            </h1>
            <p className="mt-1 text-indigo-100 capitalize">
              {userDetails.role === "artist" ? "Artista" : "Grupo Cultural"}
            </p>
          </div>

          {/* Conteúdo Principal */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Foto de Perfil e Botões */}
              <div className="flex flex-col items-center">
                {userDetails.profile_picture ? (
                  <img
                    src={getProfilePictureSrc(userDetails.profile_picture)}
                    alt="Foto de perfil"
                    className="w-32 h-32 rounded-full object-cover mb-4"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mb-4">
                    Sem foto
                  </div>
                )}
                <div className="flex flex-col gap-3 w-full">
                  <Link href={`/users/${id}/edit`}>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      Editar Perfil
                    </Button>
                  </Link>
                  <Button
                    onClick={() => router.push("/search")}
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Voltar
                  </Button>
                </div>
              </div>

              {/* Informações do Perfil */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">
                    Informações do Perfil
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Nome
                        </p>
                        <p className="text-gray-900">{userDetails.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Email
                        </p>
                        <p className="text-gray-900">{userDetails.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Papel
                        </p>
                        <p className="text-gray-900 capitalize">
                          {userDetails.role === "artist"
                            ? "Artista"
                            : "Grupo Cultural"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Biografia
                        </p>
                        <p className="text-gray-900">
                          {userDetails.bio || "Não informado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Área de Atuação
                        </p>
                        <p className="text-gray-900">
                          {userDetails.area_of_expertise || "Não informado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Criado em
                        </p>
                        <p className="text-gray-900">
                          {new Date(userDetails.created_at).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mídias e Arquivos */}
                {(userDetails.portfolio ||
                  userDetails.video ||
                  userDetails.related_files) && (
                  <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900">
                      Mídias e Arquivos
                    </h2>
                    <div className="space-y-4">
                      {userDetails.portfolio && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Portfólio
                            </p>
                            <a
                              href={getPortfolioSrc(userDetails.portfolio)}
                              download="portfolio.pdf"
                              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              Baixar Portfólio
                            </a>
                          </div>
                        </div>
                      )}
                      {userDetails.video && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="w-5 h-5 text-indigo-600" />
                            <p className="text-sm font-medium text-gray-700">
                              Vídeo
                            </p>
                          </div>
                          <video
                            src={getVideoSrc(userDetails.video)}
                            controls
                            className="w-full max-w-md rounded-md"
                          />
                        </div>
                      )}
                      {userDetails.related_files && (
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Arquivos Relacionados
                            </p>
                            <a
                              href={
                                getRelatedFilesSrc(userDetails.related_files) ||
                                undefined
                              }
                              download="related_files"
                              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <Download className="w-4 h-4" />
                              Baixar Arquivos Relacionados
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
