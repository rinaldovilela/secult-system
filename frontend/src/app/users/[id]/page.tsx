"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import Link from "next/link";

type UserDetails = {
  id: number;
  name: string;
  email: string;
  role: string;
  bio: string | null;
  area_of_expertise: string | null;
  profile_picture: string | null;
  portfolio: string | null;
  video: string | null;
  related_files: string | null;
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

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Detalhes do Usuário
        </h1>
        <div className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <p className="mt-1 text-gray-900">{userDetails.name}</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <p className="mt-1 text-gray-900">{userDetails.email}</p>
          </div>

          {/* Papel */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Papel
            </label>
            <p className="mt-1 text-gray-900 capitalize">{userDetails.role}</p>
          </div>

          {/* Biografia */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Biografia
            </label>
            <p className="mt-1 text-gray-900">
              {userDetails.bio || "Não informado"}
            </p>
          </div>

          {/* Área de Atuação */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Área de Atuação
            </label>
            <p className="mt-1 text-gray-900">
              {userDetails.area_of_expertise || "Não informado"}
            </p>
          </div>

          {/* Data de Criação */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Criado em
            </label>
            <p className="mt-1 text-gray-900">
              {new Date(userDetails.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Foto de Perfil */}
          {userDetails.profile_picture && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Foto de Perfil
              </label>
              <img
                src={`data:image/jpeg;base64,${userDetails.profile_picture}`}
                alt="Foto de perfil"
                className="mt-2 h-32 w-32 object-cover rounded-full"
              />
            </div>
          )}

          {/* Portfólio */}
          {userDetails.portfolio && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Portfólio
              </label>
              <a
                href={`data:application/pdf;base64,${userDetails.portfolio}`}
                download="portfolio.pdf"
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
              >
                Baixar Portfólio
              </a>
            </div>
          )}

          {/* Vídeo */}
          {userDetails.video && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vídeo
              </label>
              <video
                src={`data:video/mp4;base64,${userDetails.video}`}
                controls
                className="mt-2 w-full max-w-md rounded-md"
              />
            </div>
          )}

          {/* Arquivos Relacionados */}
          {userDetails.related_files && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Arquivos Relacionados
              </label>
              <a
                href={`data:application/octet-stream;base64,${userDetails.related_files}`}
                download="related_files"
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
              >
                Baixar Arquivos Relacionados
              </a>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/users/${id}/edit`}>
              <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white">
                Editar
              </Button>
            </Link>
            <Button
              onClick={() => router.push("/search")}
              variant="outline"
              className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
