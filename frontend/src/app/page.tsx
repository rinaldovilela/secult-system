// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { Calendar, MapPin, Clock, Users } from "lucide-react";

// Definir a BASE_URL para chamadas à API
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string;
  target_audience: string;
  created_at: string;
  artists: Array<{
    artist_id: string;
    artist_name: string;
    amount: number;
    is_paid: boolean;
    payment_proof_url: string | null;
  }>;
}

// Componente para exibir cada card de evento (inspirado no ResultItem do app/search/page.tsx)
const EventCard = ({ event, index }: { event: Event; index: number }) => {
  return (
    <Card
      className="bg-muted shadow-sm rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 animate-in fade-in duration-500"
      style={{ animationDelay: `${index * 100}ms` }}
      aria-label={`Ver detalhes do evento ${event.title}`}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{event.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{new Date(event.date).toLocaleDateString("pt-BR")}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {new Date(event.date).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{event.target_audience}</span>
          </div>
        </div>
        <div className="mt-4">
          <Link href={`/events?id=${event.id}`}>
            <Button
              variant="outline"
              className="w-full border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300"
              aria-label={`Saiba mais sobre o evento ${event.title}`}
            >
              Saiba Mais
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  const { user: authUser, isAuthLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar eventos da API
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Faça login novamente, para vizualisar os eventos.");
        }

        const response = await axios.get(`${BASE_URL}/api/events`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // Ordenar eventos por data (mais recentes primeiro) e limitar a 3
        const sortedEvents = response.data
          .sort(
            (a: Event, b: Event) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 3);
        setEvents(sortedEvents);
        setError(null);
      } catch (error) {
        console.error("Erro ao buscar eventos:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao carregar eventos. Tente novamente mais tarde.";
        setError(errorMessage);
        toast({
          title: "Erro ao carregar eventos",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  // Verificar autenticação (inspirado no app/search/page.tsx)
  useEffect(() => {
    if (!isAuthLoading && !authUser) {
      toast({
        title: "Acesso não autorizado",
        description: "Você precisa estar logado para acessar esta página.",
        variant: "destructive",
      });
    }
  }, [isAuthLoading, authUser]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Seção inicial */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <Card className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <svg
                  className="w-12 h-12 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <CardTitle className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Bem-vindo ao Secult System
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAuthLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4 mx-auto bg-muted-foreground/20" />
                  <div className="flex justify-center gap-4">
                    <Skeleton className="h-10 w-24 bg-muted-foreground/20" />
                    <Skeleton className="h-10 w-24 bg-muted-foreground/20" />
                  </div>
                </div>
              ) : authUser ? (
                <>
                  <p className="text-muted-foreground text-lg sm:text-xl mb-6">
                    Olá, {authUser.name}! Explore os eventos culturais e
                    gerencie suas atividades.
                  </p>
                  <div className="flex justify-center gap-4">
                    {["artist", "group"].includes(authUser.role) && (
                      <Link href="/my-events">
                        <Button
                          className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                          aria-label="Ver meus eventos"
                        >
                          Meus Eventos
                        </Button>
                      </Link>
                    )}
                    {["admin", "secretary"].includes(authUser.role) && (
                      <Link href="/events/new">
                        <Button
                          className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                          aria-label="Cadastrar novo evento"
                        >
                          Cadastrar Evento
                        </Button>
                      </Link>
                    )}
                    <Link href="/search">
                      <Button
                        variant="outline"
                        className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                        aria-label="Pesquisar eventos e artistas"
                      >
                        Pesquisar
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-lg sm:text-xl mb-6">
                    Sistema de gestão cultural para cadastro e consulta de
                    artistas e eventos.
                  </p>
                  <p className="text-muted-foreground mb-8">
                    Entre ou crie uma conta para começar!
                  </p>
                  <div className="flex justify-center gap-4">
                    <Link href="/login">
                      <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                        aria-label="Fazer login no sistema"
                      >
                        Login
                      </Button>
                    </Link>
                    <Link href="/users/register">
                      <Button
                        variant="outline"
                        className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                        aria-label="Registrar-se no sistema"
                      >
                        Registrar
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Seção de Eventos em Destaque */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
              Eventos em Destaque
            </h2>
            <Link href="/search">
              <Button
                variant="ghost"
                className="text-primary hover:bg-primary/10 transition-all duration-300"
                aria-label="Ver todos os eventos"
              >
                Ver Todos
              </Button>
            </Link>
          </div>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingEvents ? (
              // Esqueleto de carregamento para eventos
              Array.from({ length: 3 }).map((_, index) => (
                <Card
                  key={index}
                  className="bg-muted shadow-sm rounded-lg animate-pulse"
                >
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 bg-muted-foreground/20" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2 bg-muted-foreground/20" />
                      <Skeleton className="h-4 w-2/3 bg-muted-foreground/20" />
                      <Skeleton className="h-4 w-1/3 bg-muted-foreground/20" />
                      <Skeleton className="h-4 w-1/2 bg-muted-foreground/20" />
                      <Skeleton className="h-10 w-24 mt-4 bg-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : events.length === 0 ? (
              <p className="text-center text-muted-foreground col-span-full">
                Nenhum evento encontrado.
              </p>
            ) : (
              events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
