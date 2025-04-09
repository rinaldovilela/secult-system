"use client";

import { RegisterForm } from "@/components/RegisterForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Loading from "@/components/ui/loading";

export default function RegisterPage() {
  const { user, isAuthLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação
  useEffect(() => {
    if (!isAuthLoading) {
      if (user) {
        // Se já estiver logado, redireciona para dashboard
        router.push("/dashboard");
      } else {
        setIsLoading(false);
      }
    }
  }, [user, isAuthLoading, router]);

  if (isLoading || isAuthLoading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">
            Cadastro de Artista/Grupo Cultural
          </h1>
          <p className="text-indigo-100">
            Preencha os dados para se registrar na plataforma
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <Link href="/login">
              <Button
                variant="link"
                className="text-indigo-600 hover:text-indigo-800"
              >
                Já tem conta? Faça login
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" aria-label="Voltar para página inicial">
                Voltar
              </Button>
            </Link>
          </div>

          {/* Formulário */}
          <div className="border-t border-gray-200 pt-6">
            <RegisterForm />
          </div>

          {/* Rodapé */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Ao se registrar, você concorda com nossos{" "}
              <Link href="/terms" className="text-indigo-600 hover:underline">
                Termos de Serviço
              </Link>{" "}
              e{" "}
              <Link href="/privacy" className="text-indigo-600 hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
