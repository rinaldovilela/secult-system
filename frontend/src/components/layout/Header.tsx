// components/layout/Header.tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { useSocket } from "@/lib/SocketContext";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  Bell,
  User,
  Calendar,
  Search,
  FileText,
  PlusCircle,
  LogOut,
  Menu,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  name: string;
  role: string;
  profile_picture?: string;
}

export default function Header() {
  const { user: authUser, isAuthLoading } = useAuth();
  const { unreadCount } = useSocket();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Definir a variável global para a URL da API usando variável de ambiente
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = getToken();
      if (!token)
        throw new Error("Token não encontrado. Faça login novamente.");

      // Usar BASE_URL para a requisição axios
      const response = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? `Erro ao buscar perfil: ${
            error.response?.data?.error || error.message
          }`
        : `Erro ao buscar perfil: ${String(error)}`;
      setError(errorMessage);
      toast.error(errorMessage);
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        router.push("/login");
      }
    } finally {
      setIsLoadingUser(false);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthLoading || !authUser) return;
    fetchUserProfile();
  }, [isAuthLoading, authUser, fetchUserProfile]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    router.push("/login");
    setIsLoggingOut(false);
  };

  if (isAuthLoading) {
    return (
      <header className="bg-indigo-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Skeleton className="h-8 w-32 bg-indigo-700" />
          <div className="hidden lg:flex items-center gap-4">
            <Skeleton className="h-6 w-6 rounded-full bg-indigo-700" />
            <Skeleton className="h-8 w-8 rounded-full bg-indigo-700" />
          </div>
          <div className="lg:hidden">
            <Skeleton className="h-6 w-6 bg-indigo-700" />
          </div>
        </div>
      </header>
    );
  }

  if (error) {
    return (
      <header className="bg-indigo-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight hover:text-indigo-200 transition-colors">
              Secult System
            </h2>
          </Link>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-white hover:bg-indigo-700"
            aria-label="Sair do sistema"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>
    );
  }

  const isAdminOrSecretary = user && ["admin", "secretary"].includes(user.role);
  const isArtistOrGroup = user && ["artist", "group"].includes(user.role);

  const profilePictureUrl = user?.profile_picture
    ? user.profile_picture.startsWith("data:image")
      ? user.profile_picture
      : `data:image/jpeg;base64,${user.profile_picture}`
    : undefined;

  return (
    <header className="bg-indigo-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight hover:text-indigo-200 transition-colors">
            Secult System
          </h2>
        </Link>

        <div className="hidden lg:flex items-center gap-4">
          {authUser ? (
            <>
              {isArtistOrGroup && (
                <>
                  <Link
                    href="/search"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
                    aria-label="Buscar eventos"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Eventos
                  </Link>
                  <Link
                    href="/my-events"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
                    aria-label="Ver meus eventos"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Meus Eventos
                  </Link>
                </>
              )}
              {isAdminOrSecretary && (
                <>
                  <Link
                    href="/users/new"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
                    aria-label="Cadastrar novo usuário"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Cadastrar Usuário
                  </Link>
                  <Link
                    href="/events/new"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
                    aria-label="Cadastrar novo evento"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Cadastrar Evento
                  </Link>
                  <Link
                    href="/search"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
                    aria-label="Buscar usuários e eventos"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </Link>
                  <Link
                    href="/reports"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
                    aria-label="Gerar relatórios"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Relatórios
                  </Link>
                </>
              )}

              <Link
                href="/notifications"
                className="relative text-white hover:text-indigo-200"
                aria-label={`Notificações${
                  unreadCount > 0 ? `, ${unreadCount} não lidas` : ""
                }`}
              >
                <Bell className="w-7 h-7" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 w-5">
                    {unreadCount}
                  </Badge>
                )}
              </Link>

              {isLoadingUser ? (
                <Skeleton className="h-8 w-8 rounded-full bg-indigo-700" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      aria-label="Abrir menu do usuário"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={profilePictureUrl}
                          alt={user?.name || "Usuário"}
                        />
                        <AvatarFallback>
                          <User className="w-5 h-5" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-indigo-100 hidden xl:inline">
                        {user?.name || "Usuário"}
                      </span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {user?.name || "Usuário"} ({user?.role || "Desconhecido"})
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Meu Perfil
                      </Link>
                    </DropdownMenuItem>
                    {isArtistOrGroup && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/profile/edit"
                          className="flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          Editar Perfil
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-600"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {isLoggingOut ? "Saindo..." : "Sair"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                className: "text-white hover:bg-indigo-700 hover:text-white",
              })}
              aria-label="Fazer login no sistema"
            >
              <User className="w-4 h-4 mr-2" />
              Login
            </Link>
          )}
        </div>

        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="text-white hover:bg-indigo-700"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-indigo-800 text-white w-64"
            >
              <VisuallyHidden>
                <SheetTitle>Menu de Navegação</SheetTitle>
              </VisuallyHidden>
              <div className="flex flex-col gap-4 mt-6">
                {authUser ? (
                  <>
                    {isLoadingUser ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full bg-indigo-700" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24 bg-indigo-700" />
                          <Skeleton className="h-3 w-16 bg-indigo-700" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={profilePictureUrl}
                            alt={user?.name || "Usuário"}
                          />
                          <AvatarFallback>
                            <User className="w-6 h-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">
                            {user?.name || "Usuário"}
                          </p>
                          <p className="text-xs text-indigo-200">
                            {user?.role || "Desconhecido"}
                          </p>
                        </div>
                      </div>
                    )}

                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                      aria-label={`Notificações${
                        unreadCount > 0 ? `, ${unreadCount} não lidas` : ""
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                      Notificações
                      {unreadCount > 0 && (
                        <Badge className="ml-2 bg-red-500 text-white text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                      aria-label="Ver meu perfil"
                    >
                      <User className="w-5 h-5" />
                      Meu Perfil
                    </Link>

                    {isArtistOrGroup && (
                      <>
                        <Link
                          href="/profile/edit"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Editar meu perfil"
                        >
                          <User className="w-5 h-5" />
                          Editar Perfil
                        </Link>
                        <Link
                          href="/my-events"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Ver meus eventos"
                        >
                          <Calendar className="w-5 h-5" />
                          Meus Eventos
                        </Link>
                        <Link
                          href="/search"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Buscar eventos"
                        >
                          <Search className="w-5 h-5" />
                          Buscar Eventos
                        </Link>
                      </>
                    )}

                    {isAdminOrSecretary && (
                      <>
                        <Link
                          href="/users/new"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Cadastrar novo usuário"
                        >
                          <PlusCircle className="w-5 h-5" />
                          Cadastrar Usuário
                        </Link>
                        <Link
                          href="/events/new"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Cadastrar novo evento"
                        >
                          <PlusCircle className="w-5 h-5" />
                          Cadastrar Evento
                        </Link>
                        <Link
                          href="/search"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Buscar usuários e eventos"
                        >
                          <Search className="w-5 h-5" />
                          Buscar
                        </Link>
                        <Link
                          href="/reports"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                          aria-label="Gerar relatórios"
                        >
                          <FileText className="w-5 h-5" />
                          Relatórios
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-2 text-red-400 hover:bg-indigo-700 p-2 rounded"
                      aria-label="Sair do sistema"
                    >
                      <LogOut className="w-5 h-5" />
                      {isLoggingOut ? "Saindo..." : "Sair"}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                    aria-label="Fazer login no sistema"
                  >
                    <User className="w-5 h-5" />
                    Login
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
