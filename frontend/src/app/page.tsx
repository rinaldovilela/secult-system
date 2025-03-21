"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import Loading from "@/components/ui/loading";

export default function Home() {
  const { user, isAuthLoading } = useAuth() as {
    user: { name: string; role: string } | null;
    isAuthLoading: boolean;
  };

  if (isAuthLoading) return <Loading />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="text-center p-8 max-w-lg bg-white rounded-lg shadow-md">
        <h1 className="text-4xl font-bold mb-4 text-neutral-900">
          Bem-vindo ao Secult System
        </h1>
        <p className="text-lg mb-8 text-neutral-700">
          Sistema de gestão cultural para cadastro e consulta de artistas e
          eventos.
        </p>

        {user ? (
          <div className="space-y-6">
            <p className="text-xl font-semibold text-neutral-900">
              Olá, {user.name} ({user.role})!
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {["admin", "secretary"].includes(user.role) && (
                <>
                  <Button asChild variant="default">
                    <Link href="/artists/new" className="w-full sm:w-auto">
                      Cadastrar Artista
                    </Link>
                  </Button>
                  <Button asChild variant="default">
                    <Link href="/events/new" className="w-full sm:w-auto">
                      Cadastrar Evento
                    </Link>
                  </Button>
                  <Button asChild variant="default">
                    <Link href="/reports" className="w-full sm:w-auto">
                      Gerar Relatórios
                    </Link>
                  </Button>
                </>
              )}
              <Button asChild variant="default">
                <Link href="/search" className="w-full sm:w-auto">
                  Consultar Artistas e Eventos
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-lg text-neutral-900">
              Por favor, faça login ou registre-se para acessar o sistema.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="default">
                <Link href="/login" className="w-full sm:w-auto">
                  Login
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register" className="w-full sm:w-auto">
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
