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
import { getToken } from "@/lib/auth";
import { User, FileText, Image } from "lucide-react";

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
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio);
      formData.append("area_of_expertise", areaOfExpertise);
      if (profilePicture) formData.append("profile_picture", profilePicture);

      await axios.put("http://localhost:5000/api/users/me", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Perfil atualizado com sucesso!");
      router.push("/profile");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao atualizar perfil: ${
            error.response?.data?.error || error.message
          }`
        );
        if (error.response?.status === 403 || error.response?.status === 401) {
          router.push("/login");
        }
      } else {
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
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
            Editar Perfil
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                <FileText className="w-5 h-5 text-indigo-600" />
                Biografia
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="w-5 h-5 text-indigo-600" />
                Área de Atuação
              </label>
              <Input
                type="text"
                value={areaOfExpertise}
                onChange={(e) => setAreaOfExpertise(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Image className="w-5 h-5 text-indigo-600" />
                Foto de Perfil (máx. 50MB)
              </label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                className="mt-1 w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
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
