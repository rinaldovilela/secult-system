import { RegisterForm } from "@/components/RegisterForm";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cadastro de Artista/Grupo Cultural",
  description: "Registre-se como artista ou grupo cultural na plataforma.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-4 sm:p-6">
        <div className="flex justify-end mb-4">
          <Link href="/">
            <Button variant="outline" aria-label="Voltar para a página inicial">
              Voltar
            </Button>
          </Link>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
