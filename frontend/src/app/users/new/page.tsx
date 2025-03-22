"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewUser() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(""); // Valor inicial vazio
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [relatedFiles, setRelatedFiles] = useState<File | null>(null);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB em bytes

  const validateFileSize = (file: File | null, fieldName: string) => {
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(`O arquivo de ${fieldName} é muito grande. O limite é 50MB.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validar o campo role
    if (!role) {
      toast.error("Por favor, selecione o tipo (Artista ou Grupo Cultural).");
      setIsLoading(false);
      return;
    }

    // Validar o tamanho dos arquivos
    if (!validateFileSize(profilePicture, "foto de perfil")) {
      setIsLoading(false);
      return;
    }
    if (!validateFileSize(portfolio, "portfólio")) {
      setIsLoading(false);
      return;
    }
    if (!validateFileSize(video, "vídeo")) {
      setIsLoading(false);
      return;
    }
    if (!validateFileSize(relatedFiles, "arquivos relacionados")) {
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role);
      if (profilePicture) formData.append("profile_picture", profilePicture);
      if (portfolio) formData.append("portfolio", portfolio);
      if (video) formData.append("video", video);
      if (relatedFiles) formData.append("related_files", relatedFiles);

      await axios.post("http://localhost:5000/api/users", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Usuário cadastrado com sucesso!");
      router.push("/search");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao cadastrar usuário: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao cadastrar usuário: ${String(error)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Cadastrar Artista ou Grupo Cultural
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
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
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Senha
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Tipo
          </label>
          <Select onValueChange={setRole} value={role}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="artist">Artista</SelectItem>
              <SelectItem value="group">Grupo Cultural</SelectItem>
            </SelectContent>
          </Select>
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
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Portfólio (máx. 50MB)
          </label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setPortfolio(e.target.files?.[0] || null)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Vídeo (máx. 50MB)
          </label>
          <Input
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files?.[0] || null)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Arquivos Relacionados (máx. 50MB)
          </label>
          <Input
            type="file"
            onChange={(e) => setRelatedFiles(e.target.files?.[0] || null)}
          />
        </div>
        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Cadastrando..." : "Cadastrar"}
          </Button>
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
