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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [areaOfExpertise, setAreaOfExpertise] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [relatedFiles, setRelatedFiles] = useState<string | null>(null);

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
        setName(userData.name);
        setEmail(userData.email);
        setBio(userData.bio || "");
        setAreaOfExpertise(userData.area_of_expertise || "");
        setProfilePicture(
          userData.profile_picture
            ? `data:image/jpeg;base64,${userData.profile_picture}`
            : null
        );
        setPortfolio(
          userData.portfolio
            ? `data:application/pdf;base64,${userData.portfolio}`
            : null
        );
        setVideo(
          userData.video ? `data:video/mp4;base64,${userData.video}` : null
        );
        setRelatedFiles(
          userData.related_files
            ? `data:application/octet-stream;base64,${userData.related_files}`
            : null
        );
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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name,
        email,
        bio,
        area_of_expertise: areaOfExpertise,
        profile_picture: profilePicture ? profilePicture.split(",")[1] : null,
        portfolio: portfolio ? portfolio.split(",")[1] : null,
        video: video ? video.split(",")[1] : null,
        related_files: relatedFiles ? relatedFiles.split(",")[1] : null,
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
    }
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (
    !user ||
    (!["admin", "secretary"].includes(user.role) &&
      user.id !== parseInt(id as string))
  )
    return null;

  return (
    <div className="p-8">
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
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Biografia
          </label>
          <Input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
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
            Foto de Perfil
          </label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setProfilePicture)}
          />
          {profilePicture && (
            <img
              src={profilePicture}
              alt="Foto de perfil"
              className="mt-2 h-32 w-32 object-cover"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Portfólio (PDF)
          </label>
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileChange(e, setPortfolio)}
          />
          {portfolio && (
            <a
              href={portfolio}
              download="portfolio.pdf"
              className="mt-2 text-blue-500"
            >
              Baixar Portfólio
            </a>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Vídeo
          </label>
          <Input
            type="file"
            accept="video/*"
            onChange={(e) => handleFileChange(e, setVideo)}
          />
          {video && (
            <video
              src={video}
              controls
              className="mt-2 h-32 w-full object-cover"
            />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Arquivos Relacionados
          </label>
          <Input
            type="file"
            onChange={(e) => handleFileChange(e, setRelatedFiles)}
          />
          {relatedFiles && (
            <a
              href={relatedFiles}
              download="related_files"
              className="mt-2 text-blue-500"
            >
              Baixar Arquivos Relacionados
            </a>
          )}
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
