"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function Header() {
  const user = useAuth() as { name: string; role: string } | null;
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage")); // Dispara evento para atualizar o useAuth
    router.push("/login");
  };

  return (
    <header className="bg-neutral-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <h2 className="text-xl font-bold">Secult System</h2>
        </Link>
        <div>
          {user ? (
            <>
              <span className="mr-4">
                Bem-vindo, {user.name} ({user.role})
              </span>
              {user.role === "admin" && (
                <Link href="/users/new" className="mr-4">
                  <Button variant="outline">Cadastrar Usuário</Button>
                </Link>
              )}
              <Button variant="outline" onClick={handleLogout}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" className="mr-2">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button>Registrar</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
