"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import Image from "next/image";

export default function RegisterUser() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("artist");
  const [bio, setBio] = useState("");
  const [areaOfExpertise, setAreaOfExpertise] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [relatedFiles, setRelatedFiles] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const dataURLtoFile = (dataurl: string, filename: string) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role);
      formData.append("bio", bio);
      formData.append("area_of_expertise", areaOfExpertise);

      if (profilePicture) {
        formData.append(
          "profile_picture",
          dataURLtoFile(profilePicture, "profile.jpg")
        );
      }
      if (portfolio) {
        formData.append("portfolio", dataURLtoFile(portfolio, "portfolio.pdf"));
      }
      if (video) {
        formData.append("video", dataURLtoFile(video, "video.mp4"));
      }
      if (relatedFiles) {
        formData.append(
          "related_files",
          dataURLtoFile(relatedFiles, "files.zip")
        );
      }

      await axios.post("http://localhost:5000/api/users/register", formData);

      toast.success("Cadastro realizado com sucesso!");
      router.push("/login"); // Redireciona para login após registro
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(`Erro: ${error.response?.data?.error || error.message}`);
      } else {
        toast.error(`Erro durante o registro: ${String(error)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-neutral-900">
        Cadastro de Artista/Grupo Cultural
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campos obrigatórios */}
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Nome *
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
            Email *
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
            Senha *
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Todos os campos extras visíveis */}
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Tipo *
          </label>
          <Select onValueChange={setRole} value={role}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="artist">Artista Individual</SelectItem>
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
            <div className="mt-2 h-32 w-32 relative">
              <Image
                src={profilePicture}
                alt="Prévia da foto"
                fill
                className="object-cover rounded"
              />
            </div>
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

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Cadastrando..." : "Registrar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
