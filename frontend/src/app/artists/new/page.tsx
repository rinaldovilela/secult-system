"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import toast from "react-hot-toast";
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
import Loading from "@/components/ui/loading";

const artistSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  bio: z.string().optional(),
  portfolioUrl: z.string().url("URL inválida").optional(),
});

type ArtistForm = z.infer<typeof artistSchema>;

export default function NewArtist() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth() as {
    user: { role: string } | null;
    isAuthLoading: boolean;
  }; // Define explicit type for user

  useEffect(() => {
    if (isAuthLoading) return; // Espera a autenticação carregar

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }
    setIsLoading(false);
  }, [user, isAuthLoading, router]);

  const form = useForm<ArtistForm>({
    resolver: zodResolver(artistSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      portfolioUrl: "",
    },
  });

  const onSubmit = async (data: ArtistForm) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/artists",
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Artista cadastrado! ID: ${response.data.id}`);
      form.reset();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao cadastrar artista: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao cadastrar artista: ${String(error)}`);
      }
    }
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Cadastrar Artista
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Digite o email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Biografia</FormLabel>
                <FormControl>
                  <Input placeholder="Digite a biografia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="portfolioUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Portfólio</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="Digite a URL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">
            Cadastrar
          </Button>
        </form>
      </Form>
    </div>
  );
}
