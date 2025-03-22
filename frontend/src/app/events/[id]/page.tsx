"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/loading";
import Link from "next/link";

type EventDetails = {
  id: number;
  title: string;
  date: string;
  description?: string;
  location?: string;
  created_at: string;
};

export default function EventDetails() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user || !["admin", "secretary"].includes(user.role)) {
      router.push("/login");
      return;
    }

    const fetchEventDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:5000/api/events/details/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEventDetails(response.data);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar detalhes do evento: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar detalhes do evento: ${String(error)}`);
        }
        router.push("/search");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, user, isAuthLoading, router]);

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  if (!eventDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Detalhes do Evento
        </h1>
        <div className="space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <p className="mt-1 text-gray-900">{eventDetails.title}</p>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Data
            </label>
            <p className="mt-1 text-gray-900">
              {new Date(eventDetails.date).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <p className="mt-1 text-gray-900">
              {eventDetails.description || "Não informado"}
            </p>
          </div>

          {/* Localização */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Localização
            </label>
            <p className="mt-1 text-gray-900">
              {eventDetails.location || "Não informado"}
            </p>
          </div>

          {/* Data de Criação */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Criado em
            </label>
            <p className="mt-1 text-gray-900">
              {new Date(eventDetails.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/events/${id}/edit`}>
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
