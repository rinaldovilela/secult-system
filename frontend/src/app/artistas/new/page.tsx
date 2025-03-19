"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import axios from "axios";

// Schema de validação com Zod
const artistSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  bio: z.string().optional(),
  portfolioUrl: z.string().url("URL inválida").optional(),
});

type ArtistForm = z.infer<typeof artistSchema>;

export default function NewArtist() {
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
      const response = await axios.post(
        "http://localhost:5000/api/artists",
        data,
        { headers: { "Content-Type": "application/json" } }
      );
      alert(`Artista cadastrado! ID: ${response.data.id}`);
      form.reset();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Erro na requisição:",
          error.response?.data || error.message
        );
        alert(
          `Erro ao cadastrar artista: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        console.error("Erro desconhecido:", error);
        alert(`Erro ao cadastrar artista: ${String(error)}`);
      }
    }
  };

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
          <Button
            type="submit"
            className="w-full bg-primary-500 hover:bg-primary-600"
          >
            Cadastrar
          </Button>
        </form>
      </Form>
    </div>
  );
}
