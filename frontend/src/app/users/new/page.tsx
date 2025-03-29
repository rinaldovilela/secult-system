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
import {
  User,
  Mail,
  Lock,
  Image as ImageIcon,
  FileText,
  Video,
} from "lucide-react";
import { getToken } from "@/lib/auth";

export default function NewUser() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [files, setFiles] = useState({
    profile_picture: null as File | null,
    portfolio: null as File | null,
    video: null as File | null,
    related_files: null as File | null,
  });

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const validateFileSize = (file: File | null, fieldName: string) => {
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(`O arquivo de ${fieldName} é muito grande. O limite é 50MB.`);
      return false;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange =
    (field: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      if (file && validateFileSize(file, field.replace("_", " "))) {
        setFiles((prev) => ({ ...prev, [field]: file }));
      } else if (!file) {
        setFiles((prev) => ({ ...prev, [field]: null }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.role) {
      toast.error("Por favor, selecione o tipo (Artista ou Grupo Cultural).");
      setIsLoading(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        toast.error("Token não encontrado. Faça login novamente.");
        router.push("/login");
        return;
      }

      const formDataToSend = new FormData();

      // Adicionar campos de texto
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      // Adicionar arquivos
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formDataToSend.append(key, file);
        }
      });

      await axios.post("http://localhost:5000/api/users", formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Usuário cadastrado com sucesso!");
      router.push("/search");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        toast.error(`Erro ao cadastrar usuário: ${errorMessage}`);
        console.error("Detalhes do erro:", error.response?.data);
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
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full"
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="w-5 h-5 text-indigo-600" />
                Tipo
              </label>
              <Select
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, role: value }))
                }
                value={formData.role}
              >
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
                    <ImageIcon className="w-5 h-5 text-indigo-600" />
                    Foto de Perfil (máx. 50MB)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange("profile_picture")}
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
                    onChange={handleFileChange("portfolio")}
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
                    onChange={handleFileChange("video")}
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
                    onChange={handleFileChange("related_files")}
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
