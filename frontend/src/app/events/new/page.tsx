"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { z } from "zod";

// Schema de validação com Zod
const eventSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  location: z.string().min(1, "Local é obrigatório"),
  target_audience: z.string().optional(),
  artist_ids: z.array(z.number()).optional(),
});

export default function NewEvent() {
  const [formData, setFormData] = useState<{
    title: string;
    date: string;
    location: string;
    target_audience: string;
    artist_ids: number[];
  }>({
    title: "",
    date: "",
    location: "",
    target_audience: "",
    artist_ids: [],
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof formData, string>>
  >({});
  const [artists, setArtists] = useState([]);

  // Carregar artistas disponíveis
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/artists");
        setArtists(response.data);
      } catch (error) {
        console.error("Erro ao carregar artistas:", error);
      }
    };
    fetchArtists();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      eventSchema.parse(formData);
      setErrors({});

      const response = await axios.post(
        "http://localhost:5000/api/events",
        formData,
        { headers: { "Content-Type": "application/json" } }
      );
      alert(`Evento cadastrado! ID: ${response.data.id}`);
      setFormData({
        title: "",
        date: "",
        location: "",
        target_audience: "",
        artist_ids: [],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.reduce(
          (acc: Record<string, string>, err) => {
            acc[err.path[0]] = err.message;
            return acc;
          },
          {}
        );
        setErrors(fieldErrors);
      } else if (axios.isAxiosError(error)) {
        console.error(
          "Erro na requisição:",
          error.response?.data || error.message
        );
        alert(
          `Erro ao cadastrar evento: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        console.error("Erro desconhecido:", error);
        alert(`Erro ao cadastrar evento: ${String(error)}`);
      }
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cadastrar Evento</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Título"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="border p-2 w-full"
          />
          {errors.title && (
            <p className="text-red-500 text-sm">{errors.title}</p>
          )}
        </div>
        <div>
          <input
            type="datetime-local"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="border p-2 w-full"
          />
          {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
        </div>
        <div>
          <input
            type="text"
            placeholder="Local"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="border p-2 w-full"
          />
          {errors.location && (
            <p className="text-red-500 text-sm">{errors.location}</p>
          )}
        </div>
        <div>
          <input
            type="text"
            placeholder="Público-alvo"
            value={formData.target_audience}
            onChange={(e) =>
              setFormData({ ...formData, target_audience: e.target.value })
            }
            className="border p-2 w-full"
          />
          {errors.target_audience && (
            <p className="text-red-500 text-sm">{errors.target_audience}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Artistas Participantes
          </label>
          {artists.map((artist: any) => (
            <div key={artist.id} className="flex items-center">
              <input
                type="checkbox"
                value={artist.id}
                checked={formData.artist_ids.includes(artist.id)}
                onChange={(e) => {
                  const artistId = Number(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    artist_ids: prev.artist_ids.includes(artistId)
                      ? prev.artist_ids.filter((id) => id !== artistId)
                      : [...prev.artist_ids, artistId],
                  }));
                }}
                className="mr-2"
              />
              <span>{artist.name}</span>
            </div>
          ))}
        </div>
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Cadastrar
        </button>
      </form>
    </div>
  );
}
