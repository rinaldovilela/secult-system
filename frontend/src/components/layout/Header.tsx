"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function Header() {
  const { user, isAuthLoading } = useAuth() as {
    user: { name: string; role: string } | null;
    isAuthLoading: boolean;
  };
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    try {
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isAuthLoading) return null;

  return (
    <header className="bg-neutral-900 text-white p-4">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <Link href="/">
          <h2 className="text-xl font-bold">Secult System</h2>
        </Link>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <span className="text-sm sm:text-base text-neutral-200">
                Bem-vindo, {user.name} ({user.role})
              </span>
              <Button asChild variant="darkHeader" aria-label="Ver perfil">
                <Link href="/profile">Meu Perfil</Link>
              </Button>
              {user.role === "admin" && (
                <Button
                  asChild
                  variant="darkHeader"
                  aria-label="Cadastrar novo usuário"
                >
                  <Link href="/users/new">Cadastrar Usuário</Link>
                </Button>
              )}
              <Button
                variant="darkHeader"
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Sair do sistema"
              >
                {isLoggingOut ? "Saindo..." : "Sair"}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="darkHeader" aria-label="Fazer login">
                <Link href="/login">Login</Link>
              </Button>
              <Button
                asChild
                variant="darkHeader"
                aria-label="Registrar-se no sistema"
              >
                <Link href="/register">Registrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
