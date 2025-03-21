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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Loading from "@/components/ui/loading";

const eventSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  target_audience: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;

interface Artist {
  id: number;
  name: string;
}

interface ArtistSelection {
  artist_id: number;
  amount: string;
  is_paid: boolean;
}

export default function NewEvent() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthLoading } = useAuth() as {
    user: { role: string } | null;
    isAuthLoading: boolean;
  };
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<ArtistSelection[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    const fetchArtists = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:5000/api/artists", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setArtists(response.data);
      } catch (error) {
        toast.error("Erro ao carregar artistas");
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtists();
  }, [user, isAuthLoading, router]);

  const form = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      location: "",
      target_audience: "",
    },
  });

  const handleAddArtist = (artistId: number) => {
    if (!selectedArtists.some((artist) => artist.artist_id === artistId)) {
      setSelectedArtists([
        ...selectedArtists,
        { artist_id: artistId, amount: "", is_paid: false },
      ]);
    }
  };

  const handleRemoveArtist = (artistId: number) => {
    setSelectedArtists(
      selectedArtists.filter((artist) => artist.artist_id !== artistId)
    );
  };

  const handleAmountChange = (artistId: number, amount: string) => {
    setSelectedArtists(
      selectedArtists.map((artist) =>
        artist.artist_id === artistId ? { ...artist, amount } : artist
      )
    );
  };

  const handlePaidChange = (artistId: number, is_paid: boolean) => {
    setSelectedArtists(
      selectedArtists.map((artist) =>
        artist.artist_id === artistId ? { ...artist, is_paid } : artist
      )
    );
  };

  const onSubmit = async (data: EventForm) => {
    try {
      const token = localStorage.getItem("token");
      const eventData = {
        ...data,
        artists: selectedArtists.map((artist) => ({
          artist_id: artist.artist_id,
          amount: parseFloat(artist.amount) || 0,
          is_paid: artist.is_paid,
        })),
      };
      const response = await axios.post(
        "http://localhost:5000/api/events",
        eventData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Evento cadastrado! ID: ${response.data.id}`);
      form.reset();
      setSelectedArtists([]);
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

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user?.role)) return null;

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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input placeholder="Digite a descrição" {...field} />
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
                <FormLabel>Data</FormLabel>
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Artistas</h2>
            <Select onValueChange={(value) => handleAddArtist(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um artista" />
              </SelectTrigger>
              <SelectContent>
                {artists.map((artist) => (
                  <SelectItem key={artist.id} value={String(artist.id)}>
                    {artist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedArtists.length > 0 && (
              <div className="space-y-2">
                {selectedArtists.map((selected) => {
                  const artist = artists.find(
                    (a) => a.id === selected.artist_id
                  );
                  return (
                    <div
                      key={selected.artist_id}
                      className="flex items-center gap-4 p-2 border rounded-md"
                    >
                      <span className="flex-1">{artist?.name}</span>
                      <Input
                        type="number"
                        placeholder="Quantia (R$)"
                        value={selected.amount}
                        onChange={(e) =>
                          handleAmountChange(selected.artist_id, e.target.value)
                        }
                        className="w-32"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selected.is_paid}
                          onCheckedChange={(checked) =>
                            handlePaidChange(
                              selected.artist_id,
                              checked as boolean
                            )
                          }
                        />
                        <span>Já Pago</span>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => handleRemoveArtist(selected.artist_id)}
                      >
                        Remover
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <Button type="submit" className="w-full">
            Cadastrar
          </Button>
        </form>
      </Form>
    </div>
  );
}
