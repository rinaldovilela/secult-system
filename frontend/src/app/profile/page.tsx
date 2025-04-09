"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { User, Mail, FileText } from "lucide-react";
import Image from "next/image"; // Import adicionado

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  bio?: string;
  area_of_expertise?: string;
  profile_picture?: string | null;
}

export default function Profile() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user, isAuthLoading } = useAuth();
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = getToken();
        if (!token) {
          toast.error("Sessão expirada. Faça login novamente.");
          router.push("/login");
          return;
        }

        const response = await axios.get(`${BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao carregar perfil: ${
              error.response?.data?.error || error.message
            }`
          );
          if (
            error.response?.status === 401 ||
            error.response?.status === 403 ||
            error.response?.status === 404
          ) {
            router.push("/login");
          }
        } else {
          toast.error(`Erro ao carregar perfil: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, isAuthLoading, router, BASE_URL]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !profile) return null;

  const getProfilePictureSrc = (picture: string | null) => {
    if (!picture) return undefined;
    return picture.startsWith("data:image")
      ? picture
      : `data:image/jpeg;base64,${picture}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-indigo-600 p-6 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Meu Perfil - {profile.name}
            </h1>
            <p className="mt-1 text-indigo-100 capitalize">
              {profile.role === "artist"
                ? "Artista"
                : profile.role === "group"
                ? "Grupo Cultural"
                : profile.role === "admin"
                ? "Administrador"
                : "Secretário"}
            </p>
          </div>

          {/* Conteúdo Principal */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Foto de Perfil e Botões */}
              <div className="flex flex-col items-center">
                {profile.profile_picture ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4">
                    <Image
                      src={
                        getProfilePictureSrc(profile.profile_picture) ||
                        "/default-profile-picture.jpg"
                      }
                      alt={`Foto de perfil de ${profile.name}`}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mb-4">
                    Sem foto
                  </div>
                )}
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    asChild
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Link href="/profile/edit">Editar Perfil</Link>
                  </Button>
                  {["artist", "group"].includes(profile.role) && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      <Link href="/my-events">Ver Meus Eventos</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link href="/notifications">Ver Notificações</Link>
                  </Button>
                </div>
              </div>

              {/* Informações do Perfil */}
              <div className="lg:col-span-2">
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
                        <p className="text-gray-900">{profile.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Email
                        </p>
                        <p className="text-gray-900">{profile.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Tipo
                        </p>
                        <p className="text-gray-900 capitalize">
                          {profile.role === "artist"
                            ? "Artista"
                            : profile.role === "group"
                            ? "Grupo Cultural"
                            : profile.role === "admin"
                            ? "Administrador"
                            : "Secretário"}
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
                          {profile.bio || "Nenhuma biografia disponível."}
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
                          {profile.area_of_expertise || "Não especificada."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
