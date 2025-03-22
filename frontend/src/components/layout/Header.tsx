"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  LogOut,
  User,
  Calendar,
  Search,
  FileText,
  PlusCircle,
} from "lucide-react";

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

  const isAdminOrSecretary = user && ["admin", "secretary"].includes(user.role);
  const isArtistOrGroup = user && ["artist", "group"].includes(user.role);

  return (
    <header className="bg-indigo-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Logo */}
        <Link href="/">
          <h2 className="text-2xl font-bold tracking-tight hover:text-indigo-200 transition-colors">
            Secult System
          </h2>
        </Link>

        {/* Navegação */}
        <nav className="flex flex-wrap items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-indigo-100">
                Olá, {user.name} ({user.role})
              </span>
              <Button
                asChild
                variant="ghost"
                className="text-white hover:bg-indigo-700 hover:text-white"
                aria-label="Ver perfil"
              >
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Meu Perfil
                </Link>
              </Button>
              {isArtistOrGroup && (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Editar perfil"
                  >
                    <Link
                      href="/profile/edit"
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Editar Perfil
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Ver meus eventos"
                  >
                    <Link href="/my-events" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Meus Eventos
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Buscar eventos"
                  >
                    <Link href="/search" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Buscar Eventos
                    </Link>
                  </Button>
                </>
              )}
              {isAdminOrSecretary && (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Cadastrar novo usuário"
                  >
                    <Link href="/users/new" className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Cadastrar Usuário
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Cadastrar novo evento"
                  >
                    <Link
                      href="/events/new"
                      className="flex items-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Cadastrar Evento
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Buscar"
                  >
                    <Link href="/search" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Buscar
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-indigo-700 hover:text-white"
                    aria-label="Ver relatórios"
                  >
                    <Link href="/reports" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Relatórios
                    </Link>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-white hover:bg-indigo-700 hover:text-white"
                aria-label="Sair do sistema"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? "Saindo..." : "Sair"}
              </Button>
            </>
          ) : (
            <Button
              asChild
              variant="ghost"
              className="text-white hover:bg-indigo-700 hover:text-white"
              aria-label="Fazer login"
            >
              <Link href="/login" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Login
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
