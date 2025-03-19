"use client";

import { useState } from "react";
import axios from "axios";
import { z } from "zod";

// Schema de validação com Zod
const artistSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  bio: z.string().optional(),
  portfolioUrl: z.string().url("URL inválida").optional(), // Ajustado para portfolioUrl
});

export default function NewArtist() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    portfolioUrl: "", // Ajustado para portfolioUrl
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof formData, string>>
  >({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      artistSchema.parse(formData);
      setErrors({});

      const response = await axios.post(
        "http://localhost:5000/api/artists",
        formData,
        { headers: { "Content-Type": "application/json" } }
      );
      alert(`Artista cadastrado! ID: ${response.data.id}`);
      setFormData({ name: "", email: "", bio: "", portfolioUrl: "" });
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
      } else {
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
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cadastrar Artista</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Nome"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="border p-2 w-full"
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
        </div>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="border p-2 w-full"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email}</p>
          )}
        </div>
        <div>
          <textarea
            placeholder="Biografia"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="border p-2 w-full"
          />
          {errors.bio && <p className="text-red-500 text-sm">{errors.bio}</p>}
        </div>
        <div>
          <input
            type="url"
            placeholder="URL do portfólio"
            value={formData.portfolioUrl}
            onChange={(e) =>
              setFormData({ ...formData, portfolioUrl: e.target.value })
            }
            className="border p-2 w-full"
          />
          {errors.portfolioUrl && (
            <p className="text-red-500 text-sm">{errors.portfolioUrl}</p>
          )}
        </div>
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Cadastrar
        </button>
      </form>
    </div>
  );
}
