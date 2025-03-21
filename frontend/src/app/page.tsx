"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export default function Home() {
  interface User {
    name: string;
    role: string;
  }

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getUser();
    setUser(storedUser);
  }, []);

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
                  <Link href="/artists/new">
                    <Button className="w-full sm:w-auto">
                      Cadastrar Artista
                    </Button>
                  </Link>
                  <Link href="/events/new">
                    <Button className="w-full sm:w-auto">
                      Cadastrar Evento
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/search">
                <Button className="w-full sm:w-auto">
                  Consultar Artistas e Eventos
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-lg text-neutral-900">
              Por favor, faça login ou registre-se para acessar o sistema.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/login">
                <Button className="w-full sm:w-auto">Login</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full sm:w-auto">
                  Registrar
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
