// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";

// Schema de validação do formulário
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Definir a variável global para a URL da API usando variável de ambiente
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Login() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuração do formulário com react-hook-form e zod
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirecionar se o usuário já estiver autenticado
  useEffect(() => {
    if (isAuthLoading) return;

    if (user) {
      toast({
        title: "Você já está autenticado",
        description: "Redirecionando para a página inicial...",
      });
      router.push("/");
    }
  }, [user, isAuthLoading, router]);

  // Função de envio do formulário
  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/login`, data);
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      window.dispatchEvent(new Event("storage"));
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
      router.push("/");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.error || error.message || "Erro desconhecido";
        toast({
          title: "Erro ao fazer login",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao fazer login",
          description: String(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exibir esqueleto de carregamento enquanto verifica autenticação
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <Skeleton className="h-12 w-12 rounded-full bg-muted-foreground/20" />
          </div>
          <Skeleton className="h-10 w-3/4 mx-auto bg-muted-foreground/20" />
          <div className="bg-muted shadow-lg rounded-lg p-6 sm:p-8 space-y-6">
            <Skeleton className="h-6 w-1/2 bg-muted-foreground/20" />
            <Skeleton className="h-10 w-full bg-muted-foreground/20" />
            <Skeleton className="h-6 w-1/2 bg-muted-foreground/20" />
            <Skeleton className="h-10 w-full bg-muted-foreground/20" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-full bg-muted-foreground/20" />
              <Skeleton className="h-10 w-full bg-muted-foreground/20" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/3 bg-muted-foreground/20" />
              <Skeleton className="h-4 w-1/3 bg-muted-foreground/20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-muted shadow-lg rounded-lg p-6 sm:p-8 animate-in fade-in duration-500">
        <div className="flex justify-center mb-6">
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-foreground text-center">
          Acesse o Secult System
        </h1>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            aria-label="Formulário de login"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="animate-in fade-in duration-500">
                  <FormLabel className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-5 h-5 text-primary" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Digite seu email"
                      {...field}
                      disabled={isSubmitting}
                      className="w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                      aria-describedby="email-error"
                    />
                  </FormControl>
                  <FormMessage id="email-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem
                  className="animate-in fade-in duration-500"
                  style={{ animationDelay: "100ms" }}
                >
                  <FormLabel className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-5 h-5 text-primary" />
                    Senha
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Digite sua senha"
                      {...field}
                      disabled={isSubmitting}
                      className="w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                      aria-describedby="password-error"
                    />
                  </FormControl>
                  <FormMessage id="password-error" />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center text-sm">
              <Link
                href="/forgot-password"
                className="text-primary hover:underline hover:text-primary/80 transition-all duration-200"
                aria-label="Esqueceu sua senha?"
              >
                Esqueceu sua senha?
              </Link>
              <Link
                href="/users/register"
                className="text-primary hover:underline hover:text-primary/80 transition-all duration-200"
                aria-label="Registrar-se no sistema"
              >
                Não tem uma conta? Registre-se
              </Link>
            </div>
            <div
              className="flex flex-col sm:flex-row gap-4 animate-in fade-in duration-500"
              style={{ animationDelay: "200ms" }}
            >
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md transition-all duration-300 active:scale-95"
                disabled={isSubmitting}
                aria-label="Entrar no sistema"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
              <Link href="/" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 shadow-sm transition-all duration-300 active:scale-95"
                  disabled={isSubmitting}
                  aria-label="Cancelar e voltar para a página inicial"
                >
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
