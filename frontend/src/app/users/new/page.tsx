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
import { User, Mail, Lock, Image, FileText, Video } from "lucide-react";

export default function NewUser() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
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

    if (!role) {
      toast.error("Por favor, selecione o tipo (Artista ou Grupo Cultural).");
      setIsLoading(false);
      return;
    }

    if (
      !validateFileSize(profilePicture, "foto de perfil") ||
      !validateFileSize(portfolio, "portfólio") ||
      !validateFileSize(video, "vídeo") ||
      !validateFileSize(relatedFiles, "arquivos relacionados")
    ) {
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
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Cadastrar Artista ou Grupo Cultural
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="w-5 h-5 text-indigo-600" />
                  Nome
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Lock className="w-5 h-5 text-indigo-600" />
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-5 h-5 text-indigo-600" />
                Tipo
              </label>
              <Select onValueChange={setRole} value={role}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="artist">Artista</SelectItem>
                  <SelectItem value="group">Grupo Cultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Mídias e Arquivos
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Image className="w-5 h-5 text-indigo-600" />
                    Foto de Perfil (máx. 50MB)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setProfilePicture(e.target.files?.[0] || null)
                    }
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Portfólio (máx. 50MB)
                  </label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setPortfolio(e.target.files?.[0] || null)}
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Video className="w-5 h-5 text-indigo-600" />
                    Vídeo (máx. 50MB)
                  </label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideo(e.target.files?.[0] || null)}
                    className="mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Arquivos Relacionados (máx. 50MB)
                  </label>
                  <Input
                    type="file"
                    onChange={(e) =>
                      setRelatedFiles(e.target.files?.[0] || null)
                    }
                    className="mt-1 w-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isLoading ? "Cadastrando..." : "Cadastrar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/search")}
                className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
