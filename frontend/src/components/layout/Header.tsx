"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import Link from "next/link";
import { getToken } from "@/lib/auth";
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

export default function Header() {
  const { user: authUser, isAuthLoading } = useAuth();
  const router = useRouter();
  interface User {
    name: string;
    role: string;
    profile_picture?: string | ArrayBuffer;
  }

  const [user, setUser] = useState<User | null>(null); // Estado local para dados completos
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  const fetchUserProfile = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error("Erro ao buscar perfil do usuário:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await axios.get(
        "http://localhost:5000/api/notifications?unreadOnly=true",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUnreadNotifications(response.data.length);
    } catch (error) {
      console.error("Erro ao buscar notificações não lidas:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (isAuthLoading || !authUser) return;
    fetchUserProfile();
    fetchUnreadNotifications();
  }, [isAuthLoading, authUser]);

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

  if (isAuthLoading || isLoading) return null;

  const isAdminOrSecretary = user && ["admin", "secretary"].includes(user.role);
  const isArtistOrGroup = user && ["artist", "group"].includes(user.role);

  const profilePictureUrl = user?.profile_picture
    ? typeof user.profile_picture === "string"
      ? user.profile_picture.startsWith("data:image")
        ? user.profile_picture
        : `data:image/jpeg;base64,${user.profile_picture}`
      : `data:image/jpeg;base64,${Buffer.from(user.profile_picture).toString(
          "base64"
        )}`
    : undefined;

  return (
    <header className="bg-indigo-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight hover:text-indigo-200 transition-colors">
            Secult System
          </h2>
        </Link>

        {/* Navegação Desktop */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <>
              {/* Links de Navegação */}
              {isArtistOrGroup && (
                <>
                  <Link
                    href="/search"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "text-white hover:bg-indigo-700 hover:text-white",
                    })}
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
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Relatórios
                  </Link>
                </>
              )}

              {/* Sino de Notificações */}
              <Link
                href="/notifications"
                className="relative text-white hover:text-indigo-200"
                aria-label="Notificações"
              >
                <Bell className="w-6 h-6" />
                {!isLoadingNotifications && unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs">
                    {unreadNotifications}
                  </Badge>
                )}
              </Link>

              {/* Dropdown de Usuário */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profilePictureUrl} alt={user.name} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-indigo-100 hidden xl:inline">
                      {user.name}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {user.name} ({user.role})
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
            </>
          ) : (
            <Link
              href="/login"
              className={buttonVariants({
                variant: "ghost",
                className: "text-white hover:bg-indigo-700 hover:text-white",
              })}
            >
              <User className="w-4 h-4 mr-2" />
              Login
            </Link>
          )}
        </div>

        {/* Navegação Mobile */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="text-white hover:bg-indigo-700"
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
                {user ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profilePictureUrl} alt={user.name} />
                        <AvatarFallback>
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-xs text-indigo-200">{user.role}</p>
                      </div>
                    </div>

                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                    >
                      <Bell className="w-5 h-5" />
                      Notificações
                      {!isLoadingNotifications && unreadNotifications > 0 && (
                        <Badge className="ml-2 bg-red-500 text-white text-xs">
                          {unreadNotifications}
                        </Badge>
                      )}
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                    >
                      <User className="w-5 h-5" />
                      Meu Perfil
                    </Link>

                    {isArtistOrGroup && (
                      <>
                        <Link
                          href="/profile/edit"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                        >
                          <User className="w-5 h-5" />
                          Editar Perfil
                        </Link>
                        <Link
                          href="/my-events"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                        >
                          <Calendar className="w-5 h-5" />
                          Meus Eventos
                        </Link>
                        <Link
                          href="/search"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
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
                        >
                          <PlusCircle className="w-5 h-5" />
                          Cadastrar Usuário
                        </Link>
                        <Link
                          href="/events/new"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                        >
                          <PlusCircle className="w-5 h-5" />
                          Cadastrar Evento
                        </Link>
                        <Link
                          href="/search"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
                        >
                          <Search className="w-5 h-5" />
                          Buscar
                        </Link>
                        <Link
                          href="/reports"
                          className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
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
                    >
                      <LogOut className="w-5 h-5" />
                      {isLoggingOut ? "Saindo..." : "Sair"}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 text-white hover:bg-indigo-700 p-2 rounded"
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
