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

export default function RegisterUser() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [areaOfExpertise, setAreaOfExpertise] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [relatedFiles, setRelatedFiles] = useState<string | null>(null);

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
        password,
        role,
        bio,
        area_of_expertise: areaOfExpertise,
        profile_picture: profilePicture ? profilePicture.split(",")[1] : null,
        portfolio: portfolio ? portfolio.split(",")[1] : null,
        video: video ? video.split(",")[1] : null,
        related_files: relatedFiles ? relatedFiles.split(",")[1] : null,
      };
      await axios.post("http://localhost:5000/api/users/register", payload, {
        headers: { Authorization: `Bearer ${token}` },
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
    }
  };

  if (isAuthLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) return null;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Cadastrar Artista ou Grupo Cultural
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
              alt="Prévia da foto de perfil"
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
        </div>
        <div className="flex gap-4">
          <Button type="submit">Cadastrar</Button>
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
