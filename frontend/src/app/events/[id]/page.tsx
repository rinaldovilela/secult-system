"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loading from "@/components/ui/loading";

interface Event {
  id: number;
  title: string;
  description?: string;
  date: string;
  location: string;
  target_audience: string;
  artists: {
    artist_id: number;
    artist_name: string;
    amount: number;
    is_paid: boolean;
  }[];
}

export default function EditEvent() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  useEffect(() => {
    if (isAuthLoading) return;

    if (user === null || !["admin", "secretary"].includes(user?.role)) {
      router.push("/login");
      return;
    }

    const fetchEvent = async () => {
      try {
        console.log(`Buscando evento com ID: ${id}`); // Log para depuração
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:5000/api/events/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Evento retornado:", response.data); // Log para depuração
        setEvent(response.data);
        setTitle(response.data.title);
        setDescription(response.data.description || "");
        setDate(new Date(response.data.date).toISOString().split("T")[0]);
        setLocation(response.data.location);
        setTargetAudience(response.data.target_audience);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar evento: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar evento: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [id, user, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      // Converter a data para o formato ISO (ex.: "2025-03-21T00:00:00.000Z")
      const formattedDate = new Date(date).toISOString();
      const payload = {
        title,
        description,
        date: formattedDate,
        location,
        target_audience: targetAudience,
      };
      console.log("Dados enviados no PUT:", payload);
      await axios.put(`http://localhost:5000/api/events/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Evento atualizado com sucesso!");
      router.push("/search");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao atualizar evento: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao atualizar evento: ${String(error)}`);
      }
    }
  };
  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;
  if (!event) return <div>Evento não encontrado.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Editar Evento - {event.title}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Título
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Descrição
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Data
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Local
          </label>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Público-Alvo
          </label>
          <Select onValueChange={setTargetAudience} value={targetAudience}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o público-alvo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Geral">Geral</SelectItem>
              <SelectItem value="Infantil">Infantil</SelectItem>
              <SelectItem value="Adulto">Adulto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4">
          <Button type="submit">Salvar</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/search")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
