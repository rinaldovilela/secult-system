"use client";

import { useState, useEffect, useRef } from "react";
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
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Login() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Inicializar o formulário com valores padrão (email pode ser preenchido do localStorage)
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email:
        typeof window !== "undefined"
          ? localStorage.getItem("rememberedEmail") || ""
          : "",
      password: "",
      rememberMe: false,
    },
  });

  // Focar no campo de email ao carregar a página
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

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

  // Função de envio do formulário com timeout e feedback de erro aprimorado
  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => {
        source.cancel("Tempo de requisição excedido. Tente novamente.");
      }, 10000); // Timeout de 10 segundos

      const response = await axios.post(
        `${BASE_URL}/api/login`,
        {
          email: data.email,
          password: data.password,
        },
        {
          cancelToken: source.token,
        }
      );

      clearTimeout(timeout);

      // Salvar e-mail se "Lembrar-me" estiver marcado
      if (data.rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      window.dispatchEvent(new Event("storage"));
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso!",
      });
      router.push("/");
    } catch (error) {
      let errorMessage = "Erro desconhecido";
      let action = null;

      if (axios.isCancel(error)) {
        errorMessage = error.message || "Erro desconhecido";
      } else if (axios.isAxiosError(error)) {
        const serverError = error.response?.data?.error;
        if (serverError === "E-mail não cadastrado") {
          errorMessage = "E-mail não cadastrado.";
          action = (
            <Link href="/users/register" className="underline">
              Deseja se registrar?
            </Link>
          );
        } else if (serverError === "Senha incorreta") {
          errorMessage = "Senha incorreta. Tente novamente.";
        } else if (
          serverError ===
          "Muitas tentativas de login. Tente novamente em 15 minutos."
        ) {
          errorMessage = serverError;
        } else {
          errorMessage = serverError || error.message;
        }
      } else {
        errorMessage = String(error);
      }

      toast({
        title: "Erro ao fazer login",
        description: (
          <div>
            {errorMessage}
            {action && <div className="mt-2">{action}</div>}
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debounce para evitar múltiplos envios
  const handleSubmitWithDebounce = form.handleSubmit((data) => {
    if (isSubmitting) return;
    onSubmit(data);
  });

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
            onSubmit={handleSubmitWithDebounce}
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
                      ref={emailInputRef}
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
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      className="rounded border-muted-foreground/20 text-primary focus:ring-primary"
                      aria-label="Lembrar meu e-mail"
                    />
                  </FormControl>
                  <FormLabel className="text-sm text-muted-foreground">
                    Lembrar meu e-mail
                  </FormLabel>
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
