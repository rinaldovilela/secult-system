"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import Loading from "@/components/ui/loading";

const eventSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  target_audience: z.string().optional(),
  artist_ids: z.array(z.number()).optional(),
});

type EventForm = z.infer<typeof eventSchema>;

export default function NewEvent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = getUser();
    setUser(storedUser);
    if (!storedUser || !["admin", "secretary"].includes(storedUser?.role)) {
      router.push("/login");
    }
    setIsLoading(false);
  }, [router]);

  const [artists, setArtists] = useState([]);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/artists", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setArtists(response.data);
      } catch (error) {
        console.error("Erro ao carregar artistas:", error);
        toast.error("Erro ao carregar artistas");
      }
    };
    if (user) fetchArtists();
  }, [user]);

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: "",
      location: "",
      target_audience: "",
      artist_ids: [],
    },
  });

  const onSubmit = async (data: EventForm) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/events",
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Evento cadastrado! ID: ${response.data.id}`);
      form.reset();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao cadastrar evento: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao cadastrar evento: ${String(error)}`);
      }
    }
  };

  if (isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Cadastrar Evento
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o título" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data e Hora</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="target_audience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Público-Alvo</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o público-alvo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="artist_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Artistas Participantes</FormLabel>
                <div className="space-y-2">
                  {artists.map((artist: any) => (
                    <div
                      key={artist.id}
                      className="flex items-center space-x-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(artist.id)}
                          onCheckedChange={(checked) => {
                            const newValue = checked
                              ? [...(field.value || []), artist.id]
                              : (field.value || []).filter(
                                  (id: number) => id !== artist.id
                                );
                            field.onChange(newValue);
                          }}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">{artist.name}</FormLabel>
                    </div>
                  ))}
                </div>
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
