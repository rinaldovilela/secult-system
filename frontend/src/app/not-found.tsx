"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-muted shadow-lg rounded-lg p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6">
          <svg
            className="w-16 h-16 text-primary"
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
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Página Não Encontrada
        </h2>
        <p className="text-muted-foreground mb-8">
          Desculpe, mas a página que você está procurando não existe ou foi
          movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/" className="w-full">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
              aria-label="Voltar para a página inicial"
            >
              Voltar para a Página Inicial
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button
              variant="outline"
              className="w-full border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
              aria-label="Ir para a página de login"
            >
              Ir para o Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
