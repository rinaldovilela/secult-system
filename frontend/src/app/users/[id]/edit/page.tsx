"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import axios from "axios";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/ui/loading";
import Image from "next/image";

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
    profilePictureFile: null as File | null,
    portfolio: null as string | null,
    portfolioFile: null as File | null,
    video: null as string | null,
    videoFile: null as File | null,
    relatedFiles: null as string | null,
    relatedFilesFile: null as File | null,
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
          `http://localhost:5000/api/users/${id}?timestamp=${Date.now()}`,
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
          profilePictureFile: null,
          portfolio: userData.portfolio
            ? `data:application/pdf;base64,${userData.portfolio}`
            : null,
          portfolioFile: null,
          video: userData.video
            ? `data:video/mp4;base64,${userData.video}`
            : null,
          videoFile: null,
          relatedFiles: userData.related_files
            ? `data:application/octet-stream;base64,${userData.related_files}`
            : null,
          relatedFilesFile: null,
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

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (formData.profilePicture?.startsWith("blob:")) {
        URL.revokeObjectURL(formData.profilePicture);
      }
      if (formData.portfolio?.startsWith("blob:")) {
        URL.revokeObjectURL(formData.portfolio);
      }
      if (formData.video?.startsWith("blob:")) {
        URL.revokeObjectURL(formData.video);
      }
      if (formData.relatedFiles?.startsWith("blob:")) {
        URL.revokeObjectURL(formData.relatedFiles);
      }
    };
  }, [formData]);

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
      const objectUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, [field]: objectUrl }));

      // Armazena o arquivo original para envio
      const fileField = `${field}File` as keyof typeof formData;
      setFormData((prev) => ({ ...prev, [fileField]: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("bio", formData.bio);
      formDataToSend.append("area_of_expertise", formData.areaOfExpertise);
      formDataToSend.append("role", formData.role);

      // Add files if they exist - usando os arquivos originais
      if (formData.profilePictureFile) {
        formDataToSend.append("profile_picture", formData.profilePictureFile);
      }
      if (formData.portfolioFile) {
        formDataToSend.append("portfolio", formData.portfolioFile);
      }
      if (formData.videoFile) {
        formDataToSend.append("video", formData.videoFile);
      }
      if (formData.relatedFilesFile) {
        formDataToSend.append("related_files", formData.relatedFilesFile);
      }

      await axios.put(`http://localhost:5000/api/users/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Perfil atualizado com sucesso!");
      // Force refresh and redirect
      router.refresh();
      router.push(`/users/${id}`);
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
          {/* Name */}
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

          {/* Bio */}
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

          {/* Area of Expertise */}
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

          {/* Role (admin/secretary only) */}
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

          {/* Profile Picture */}
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
                <Image
                  src={formData.profilePicture}
                  alt="Preview"
                  width={128}
                  height={128}
                  className="h-32 w-32 object-cover rounded-full"
                  key={formData.profilePicture}
                />
              </div>
            )}
          </div>

          {/* Portfolio */}
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

          {/* Video */}
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
                key={formData.video}
              />
            )}
          </div>

          {/* Related Files */}
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

          {/* Buttons */}
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
