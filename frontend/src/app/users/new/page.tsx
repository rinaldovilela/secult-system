"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loading from "@/components/ui/loading";

const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "secretary", "artist", "organizer"], {
    errorMap: () => ({ message: "Selecione um papel válido" }),
  }),
});

type UserForm = z.infer<typeof userSchema>;

export default function NewUser() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const user = useAuth();

  if (user && user.role !== "admin") {
    router.push("/login");
  }
  setTimeout(() => setIsLoading(false), 0);

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "artist",
    },
  });

  const onSubmit = async (data: UserForm) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/register",
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Usuário cadastrado! ID: ${response.data.id}`);
      form.reset();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao cadastrar: ${error.response?.data?.error || error.message}`
        );
      } else {
        toast.error(`Erro ao cadastrar: ${String(error)}`);
      }
    }
  };

  if (isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Cadastrar Usuário
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Digite a senha"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Papel</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um papel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="secretary">Secretário</SelectItem>
                    <SelectItem value="artist">Artista</SelectItem>
                    <SelectItem value="organizer">
                      Organizador de Eventos
                    </SelectItem>
                  </SelectContent>
                </Select>
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
