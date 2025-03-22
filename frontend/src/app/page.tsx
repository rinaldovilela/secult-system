"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import Loading from "@/components/ui/loading";
import { UserPlus, Calendar, FileText, Search } from "lucide-react";

export default function Home() {
  const { user, isAuthLoading } = useAuth() as {
    user: { name: string; role: string } | null;
    isAuthLoading: boolean;
  };

  if (isAuthLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-lg bg-white rounded-lg shadow-lg p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
          Bem-vindo ao Secult System
        </h1>
        <p className="text-lg mb-8 text-gray-600">
          Sistema de gestão cultural para cadastro e consulta de artistas e
          eventos.
        </p>

        {user ? (
          <div className="space-y-6">
            <p className="text-xl font-semibold text-gray-900">
              Olá, {user.name} ({user.role})!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {["admin", "secretary"].includes(user.role) && (
                <>
                  <Button
                    asChild
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Link href="/users/new" className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Cadastrar Artista
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Link
                      href="/events/new"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-5 h-5" />
                      Cadastrar Evento
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Link href="/reports" className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Gerar Relatórios
                    </Link>
                  </Button>
                </>
              )}
              <Button
                asChild
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Link href="/search" className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Consultar Artistas e Eventos
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-lg text-gray-900">
              Por favor, faça login ou registre-se para acessar o sistema.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Login
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <Link href="/register" className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Registrar
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
