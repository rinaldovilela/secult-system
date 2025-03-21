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

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  bio?: string;
  area_of_expertise?: string;
  profile_picture?: string | null; // Pode ser uma URL ou base64
}

export default function Profile() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user, isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      console.log("Usuário não autenticado, redirecionando para /login");
      router.push("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error("Token não encontrado no localStorage");
          toast.error("Sessão expirada. Faça login novamente.");
          router.push("/login");
          return;
        }

        console.log("Token enviado na requisição:", token);

        const response = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Resposta do endpoint /api/users/me:", response.data);
        setProfile(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "Erro na requisição para /api/users/me:",
            error.response?.data || error.message
          );
          toast.error(
            `Erro ao carregar perfil: ${
              error.response?.data?.error || error.message
            }`
          );
          if (error.response?.status === 401) {
            console.log(
              "Erro de autenticação (401), redirecionando para /login"
            );
            router.push("/login");
          } else if (error.response?.status === 403) {
            console.log("Acesso negado (403), redirecionando para /login");
            router.push("/login");
          } else if (error.response?.status === 404) {
            console.log(
              "Usuário não encontrado (404), redirecionando para /login"
            );
            router.push("/login");
          }
        } else {
          console.error("Erro desconhecido ao carregar perfil:", error);
          toast.error(`Erro ao carregar perfil: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !profile) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Meu Perfil - {profile.name}
      </h1>
      <div className="space-y-8">
        {/* Detalhes do Perfil */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900">
            Informações do Perfil
          </h2>
          <div className="space-y-4">
            {profile.profile_picture ? (
              <div className="flex justify-center">
                <img
                  src={
                    typeof profile.profile_picture === "string"
                      ? profile.profile_picture
                      : `data:image/jpeg;base64,${Buffer.from(
                          profile.profile_picture
                        ).toString("base64")}`
                  }
                  alt="Foto de Perfil"
                  className="w-32 h-32 rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  Sem foto
                </div>
              </div>
            )}
            <div>
              <p className="text-neutral-700">
                <strong>Nome:</strong> {profile.name}
              </p>
              <p className="text-neutral-700">
                <strong>Email:</strong> {profile.email}
              </p>
              <p className="text-neutral-700">
                <strong>Tipo:</strong>{" "}
                {profile.role === "artist"
                  ? "Artista"
                  : profile.role === "group"
                  ? "Grupo Cultural"
                  : profile.role === "admin"
                  ? "Administrador"
                  : "Secretário"}
              </p>
              <p className="text-neutral-700">
                <strong>Biografia:</strong>{" "}
                {profile.bio || "Nenhuma biografia disponível."}
              </p>
              <p className="text-neutral-700">
                <strong>Área de Atuação:</strong>{" "}
                {profile.area_of_expertise || "Não especificada."}
              </p>
            </div>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/profile/edit">Editar Perfil</Link>
              </Button>
              {["artist", "group"].includes(profile.role) && (
                <Button asChild variant="outline">
                  <Link href="/my-events">Ver Meus Eventos</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
