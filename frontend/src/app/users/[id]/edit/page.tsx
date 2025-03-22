"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/ui/loading";

export default function EditUser() {
  const router = useRouter();
  const { id } = useParams();
  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    areaOfExpertise: "",
    role: "",
    profilePicture: null as string | null,
    portfolio: null as string | null,
    video: null as string | null,
    relatedFiles: null as string | null,
  });

  useEffect(() => {
    if (isAuthLoading) return;

    if (
      !user ||
      (!["admin", "secretary"].includes(user.role) &&
        user.id !== parseInt(id as string))
    ) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `http://localhost:5000/api/users/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const userData = response.data;
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          bio: userData.bio || "",
          areaOfExpertise: userData.area_of_expertise || "",
          role: userData.role || "",
          profilePicture: userData.profile_picture
            ? `data:image/jpeg;base64,${userData.profile_picture}`
            : null,
          portfolio: userData.portfolio
            ? `data:application/pdf;base64,${userData.portfolio}`
            : null,
          video: userData.video
            ? `data:video/mp4;base64,${userData.video}`
            : null,
          relatedFiles: userData.related_files
            ? `data:application/octet-stream;base64,${userData.related_files}`
            : null,
        });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          toast.error(
            `Erro ao buscar usuário: ${
              error.response?.data?.error || error.message
            }`
          );
        } else {
          toast.error(`Erro ao buscar usuário: ${String(error)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id, user, isAuthLoading, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof typeof formData
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        area_of_expertise: formData.areaOfExpertise,
        role: formData.role,
        profile_picture: formData.profilePicture
          ? formData.profilePicture.split(",")[1]
          : null,
        portfolio: formData.portfolio ? formData.portfolio.split(",")[1] : null,
        video: formData.video ? formData.video.split(",")[1] : null,
        related_files: formData.relatedFiles
          ? formData.relatedFiles.split(",")[1]
          : null,
      };
      await axios.put(`http://localhost:5000/api/users/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Perfil atualizado com sucesso!");
      router.push("/search");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Erro ao atualizar perfil: ${
            error.response?.data?.error || error.message
          }`
        );
      } else {
        toast.error(`Erro ao atualizar perfil: ${String(error)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (
    !user ||
    (!["admin", "secretary"].includes(user.role) &&
      user.id !== parseInt(id as string))
  )
    return null;

  const isAdminOrSecretary = ["admin", "secretary"].includes(user.role);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">
          Editar Perfil
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Biografia */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Biografia
            </label>
            <Input
              type="text"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Área de Atuação */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Área de Atuação
            </label>
            <Input
              type="text"
              name="areaOfExpertise"
              value={formData.areaOfExpertise}
              onChange={handleInputChange}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Role (apenas para admin/secretary) */}
          {isAdminOrSecretary && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Papel <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              >
                <option value="" disabled>
                  Selecione um papel
                </option>
                <option value="artist">Artista</option>
                <option value="group">Grupo</option>
              </select>
            </div>
          )}

          {/* Foto de Perfil */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Foto de Perfil
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "profilePicture")}
              className="mt-1 w-full"
            />
            {formData.profilePicture && (
              <div className="mt-2">
                <img
                  src={formData.profilePicture}
                  alt="Foto de perfil"
                  className="h-32 w-32 object-cover rounded-full"
                />
              </div>
            )}
          </div>

          {/* Portfólio */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Portfólio (PDF)
            </label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, "portfolio")}
              className="mt-1 w-full"
            />
            {formData.portfolio && (
              <a
                href={formData.portfolio}
                download="portfolio.pdf"
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
              >
                Baixar Portfólio Atual
              </a>
            )}
          </div>

          {/* Vídeo */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vídeo
            </label>
            <Input
              type="file"
              accept="video/*"
              onChange={(e) => handleFileChange(e, "video")}
              className="mt-1 w-full"
            />
            {formData.video && (
              <video
                src={formData.video}
                controls
                className="mt-2 w-full max-w-md rounded-md"
              />
            )}
          </div>

          {/* Arquivos Relacionados */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Arquivos Relacionados
            </label>
            <Input
              type="file"
              onChange={(e) => handleFileChange(e, "relatedFiles")}
              className="mt-1 w-full"
            />
            {formData.relatedFiles && (
              <a
                href={formData.relatedFiles}
                download="related_files"
                className="mt-2 inline-block text-indigo-600 hover:text-indigo-800"
              >
                Baixar Arquivos Relacionados Atuais
              </a>
            )}
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
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
  );
}
