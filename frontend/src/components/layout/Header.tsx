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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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
  UserPlus,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  name: string;
  role: string;
  profile_picture?: string;
  files?: Array<{ entity_type: string; file_link: string }>;
}

export default function Header() {
  const { user: authUser, isAuthLoading } = useAuth();
  const { unreadCount } = useSocket();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isProfilePictureValid, setIsProfilePictureValid] = useState<
    boolean | null
  >(null);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = getToken();
      if (!token)
        throw new Error("Token não encontrado. Faça login novamente.");

      const response = await axios.get(`${BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedUser = response.data;
      setUser(fetchedUser);

      // Verificar a validade do profile_picture
      const profilePictureUrl = fetchedUser?.files?.find(
        (f: { entity_type: string }) => f.entity_type === "user"
      )?.file_link;
      if (profilePictureUrl) {
        try {
          const response = await fetch(profilePictureUrl, { method: "HEAD" });
          if (response.ok) {
            setIsProfilePictureValid(true);
          } else {
            setIsProfilePictureValid(false);
            toast.error(
              "A foto de perfil não está mais disponível. Por favor, atualize sua foto no perfil.",
              { duration: 5000 }
            );
          }
        } catch {
          setIsProfilePictureValid(false);
          toast.error(
            "A foto de perfil não está mais disponível. Por favor, atualize sua foto no perfil.",
            { duration: 5000 }
          );
        }
      } else {
        setIsProfilePictureValid(false);
      }
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
  }, [router, BASE_URL]);

  useEffect(() => {
    if (isAuthLoading || !authUser) return;
    fetchUserProfile();
  }, [isAuthLoading, authUser, fetchUserProfile]);

  // Listener para atualizar o perfil após edição
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchUserProfile();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [fetchUserProfile]);

  // Atalho de teclado para abrir o menu mobile
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "[") {
        setIsSheetOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

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
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm rounded-b-lg animate-in slide-in-from-top duration-300">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <Skeleton className="h-8 w-32 bg-muted rounded" />
          <div className="hidden lg:flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-6 w-6 rounded-full bg-muted" />
            <Skeleton className="h-8 w-8 rounded-full bg-muted" />
          </div>
          <div className="lg:hidden">
            <Skeleton className="h-6 w-6 bg-muted rounded" />
          </div>
        </div>
      </header>
    );
  }

  if (error) {
    return (
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm rounded-b-lg animate-in slide-in-from-top duration-300">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="w-5 sm:w-6 h-5 sm:h-6"
              viewBox="0 0 24 24"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="logoGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    style={{ stopColor: "#ffffff", stopOpacity: 1 }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: "#93c5fd", stopOpacity: 1 }}
                  />
                </linearGradient>
              </defs>
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"
                stroke="url(#logoGradient)"
                strokeWidth="2"
              />
            </svg>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
              Secult System
            </h2>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Alternar tema</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="hover:bg-primary-foreground/10 text-primary-foreground rounded-lg transition-all duration-300 focus:ring-2 focus:ring-primary-foreground/50"
              aria-label="Sair do sistema"
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              {isLoggingOut ? "Saindo..." : "Sair"}
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const isAdminOrSecretary = user && ["admin", "secretary"].includes(user.role);
  const isArtistOrGroup = user && ["artist", "group"].includes(user.role);

  const profilePictureUrl =
    isProfilePictureValid === false
      ? "/default-avatar.png"
      : user?.files?.find((f) => f.entity_type === "user")?.file_link ||
        "/default-avatar.png";

  return (
    <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm rounded-b-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <svg
            className="w-5 sm:w-6 h-5 sm:h-6 transition-all duration-300 group-hover:scale-110 group-hover:brightness-125"
            viewBox="0 0 24 24"
            fill="none"
          >
            <defs>
              <linearGradient
                id="logoGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "#ffffff", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#93c5fd", stopOpacity: 1 }}
                />
              </linearGradient>
              <linearGradient
                id="logoGradientHover"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  style={{ stopColor: "#ffffff", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#60a5fa", stopOpacity: 1 }}
                />
              </linearGradient>
            </defs>
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"
              stroke="url(#logoGradient)"
              strokeWidth="2"
              className="group-hover:stroke-[url(#logoGradientHover)]"
            />
          </svg>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
            Secult System
          </h2>
        </Link>

        <div className="hidden lg:flex items-center gap-3 sm:gap-4">
          {authUser ? (
            <>
              {isArtistOrGroup && (
                <>
                  <Link
                    href="/search"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
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
                        "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 delay-100 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
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
                        "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
                    })}
                    aria-label="Cadastrar novo usuário"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Cadastro
                  </Link>
                  <Link
                    href="/events/new"
                    className={buttonVariants({
                      variant: "ghost",
                      className:
                        "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 delay-100 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
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
                        "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 delay-200 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
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
                        "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 delay-300 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
                    })}
                    aria-label="Gerar relatórios"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Relatórios
                  </Link>
                </>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/notifications"
                      className="relative hover:text-primary-foreground/80 animate-in fade-in duration-300 delay-400 focus:ring-2 focus:ring-primary-foreground/50 rounded-lg p-1"
                      aria-label={`Notificações${
                        unreadCount > 0 ? `, ${unreadCount} não lidas` : ""
                      }`}
                    >
                      <Bell className="w-5 h-5 text-primary-foreground" />
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs h-5 w-5 animate-bounce">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Notificações{unreadCount > 0 ? ` (${unreadCount})` : ""}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ThemeToggle />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Alternar tema</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isLoadingUser ? (
                <Skeleton className="h-8 w-8 rounded-full bg-muted" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="flex items-center gap-2 cursor-pointer animate-in fade-in duration-300 delay-500 hover:bg-primary-foreground/10 p-2 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-primary-foreground/50"
                      aria-label="Abrir menu do usuário"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={profilePictureUrl}
                          alt={user?.name || "Usuário"}
                        />
                        <AvatarFallback>
                          <User className="w-5 h-5 text-primary-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm hidden xl:inline text-primary-foreground">
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
                      className="text-destructive"
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      {isLoggingOut ? "Saindo..." : "Sair"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className={buttonVariants({
                  variant: "ghost",
                  className:
                    "hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
                })}
                aria-label="Fazer login no sistema"
              >
                <User className="w-4 h-4 mr-2 text-primary-foreground" />
                Login
              </Link>
              <Link
                href="/users/register"
                className={buttonVariants({
                  variant: "outline",
                  className:
                    "border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground animate-in fade-in duration-300 delay-100 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-primary-foreground after:transition-all after:duration-300 hover:after:w-full focus:ring-2 focus:ring-primary-foreground/50",
                })}
                aria-label="Registrar-se no sistema"
              >
                <UserPlus className="w-4 h-4 mr-2 text-primary-foreground" />
                Registrar
              </Link>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ThemeToggle />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Alternar tema</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        <div className="lg:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="hover:bg-primary-foreground/10 p-2 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-primary-foreground/50"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="w-6 h-6 text-primary-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground w-64 sm:w-72 p-6 shadow-lg transition-all duration-300 ease-in-out"
            >
              <SheetTitle className="text-lg font-semibold mb-4">
                Menu
              </SheetTitle>
              <div className="flex flex-col gap-3">
                {authUser ? (
                  <>
                    {isLoadingUser ? (
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24 bg-muted" />
                          <Skeleton className="h-3 w-16 bg-muted" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-foreground/10">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={profilePictureUrl}
                            alt={user?.name || "Usuário"}
                          />
                          <AvatarFallback>
                            <User className="w-6 h-6 text-primary-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-primary-foreground">
                            {user?.name || "Usuário"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user?.role || "Desconhecido"}
                          </p>
                        </div>
                      </div>
                    )}

                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                      aria-label={`Notificações${
                        unreadCount > 0 ? `, ${unreadCount} não lidas` : ""
                      }`}
                    >
                      <Bell className="w-5 h-5 text-primary-foreground" />
                      Notificações
                      {unreadCount > 0 && (
                        <Badge className="ml-2 bg-orange-500 text-white text-xs animate-bounce">
                          {unreadCount}
                        </Badge>
                      )}
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                      aria-label="Ver meu perfil"
                    >
                      <User className="w-5 h-5 text-primary-foreground" />
                      Meu Perfil
                    </Link>

                    {isArtistOrGroup && (
                      <>
                        <Link
                          href="/profile/edit"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Editar meu perfil"
                        >
                          <User className="w-5 h-5 text-primary-foreground" />
                          Editar Perfil
                        </Link>
                        <Link
                          href="/my-events"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Ver meus eventos"
                        >
                          <Calendar className="w-5 h-5 text-primary-foreground" />
                          Meus Eventos
                        </Link>
                        <Link
                          href="/search"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Buscar eventos"
                        >
                          <Search className="w-5 h-5 text-primary-foreground" />
                          Buscar Eventos
                        </Link>
                      </>
                    )}

                    {isAdminOrSecretary && (
                      <>
                        <Link
                          href="/users/new"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Cadastrar novo usuário"
                        >
                          <PlusCircle className="w-5 h-5 text-primary-foreground" />
                          Cadastro
                        </Link>
                        <Link
                          href="/events/new"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Cadastrar novo evento"
                        >
                          <PlusCircle className="w-5 h-5 text-primary-foreground" />
                          Cadastrar Evento
                        </Link>
                        <Link
                          href="/search"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Buscar usuários e eventos"
                        >
                          <Search className="w-5 h-5 text-primary-foreground" />
                          Buscar
                        </Link>
                        <Link
                          href="/reports"
                          className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                          aria-label="Gerar relatórios"
                        >
                          <FileText className="w-5 h-5 text-primary-foreground" />
                          Relatórios
                        </Link>
                      </>
                    )}

                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-2 text-destructive hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                      aria-label="Sair do sistema"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-5 h-5 mr-2" />
                      )}
                      {isLoggingOut ? "Saindo..." : "Sair"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                      aria-label="Fazer login no sistema"
                    >
                      <User className="w-5 h-5 text-primary-foreground" />
                      Login
                    </Link>
                    <Link
                      href="/users/register"
                      className="flex items-center gap-2 hover:bg-primary-foreground/10 p-3 rounded-lg transition-all duration-300 active:scale-95 focus:ring-2 focus:ring-primary-foreground/50"
                      aria-label="Registrar-se no sistema"
                    >
                      <UserPlus className="w-5 h-5 text-primary-foreground" />
                      Registrar
                    </Link>
                  </>
                )}
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
