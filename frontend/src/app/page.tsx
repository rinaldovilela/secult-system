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
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8 text-neutral-900">
        Bem-vindo ao Secult System
      </h1>
      <p className="text-lg mb-6 text-neutral-700">
        Sistema de gestão cultural para cadastro e consulta de artistas e
        eventos.
      </p>

      {user ? (
        <div className="space-y-4">
          <p className="text-neutral-900">
            Olá, {user.name} ({user.role})!
          </p>
          <div className="flex flex-wrap gap-4">
            {["admin", "secretary"].includes(user.role) && (
              <>
                <Link href="/artists/new">
                  <Button>Cadastrar Artista</Button>
                </Link>
                <Link href="/events/new">
                  <Button>Cadastrar Evento</Button>
                </Link>
              </>
            )}
            <Link href="/search">
              <Button>Consultar Artistas e Eventos</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-neutral-900">
            Por favor, faça login ou registre-se para acessar o sistema.
          </p>
          <div className="flex gap-4">
            <Link href="/login">
              <Button>Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Registrar</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
