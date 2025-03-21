"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth"; // Importar getToken

export default function EditProfile() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [areaOfExpertise, setAreaOfExpertise] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setAreaOfExpertise(user.area_of_expertise || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) {
        console.error("Token não encontrado no localStorage");
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }

      console.log("Token enviado na requisição:", token); // Log para depuração

      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio);
      formData.append("area_of_expertise", areaOfExpertise);
      if (profilePicture) formData.append("profile_picture", profilePicture);

      const response = await axios.put(
        "http://localhost:5000/api/users/me",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Resposta do endpoint PUT /api/users/me:", response.data); // Log para depuração
      toast.success("Perfil atualizado com sucesso!");
      router.push("/profile");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Erro na requisição para PUT /api/users/me:",
          error.response?.data || error.message
        ); // Log para depuração
        toast.error(
          `Erro ao atualizar perfil: ${
            error.response?.data?.error || error.message
          }`
        );
        if (error.response?.status === 403 || error.response?.status === 401) {
          router.push("/login");
        }
      } else {
        console.error("Erro desconhecido ao atualizar perfil:", error); // Log para depuração
        toast.error(`Erro ao atualizar perfil: ${String(error)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return <Loading />;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Editar Perfil
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Nome
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Biografia
          </label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Área de Atuação
          </label>
          <Input
            type="text"
            value={areaOfExpertise}
            onChange={(e) => setAreaOfExpertise(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Foto de Perfil (máx. 50MB)
          </label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
          />
        </div>
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/profile")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
