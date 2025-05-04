"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import {
  User,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Video,
  Calendar,
  Image as ImageIcon,
  ArrowLeft,
  Copy,
  RotateCw,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MaskedInput } from "@/components/MaskedInput";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import Loading from "@/components/ui/loading";
import { getToken } from "@/lib/auth";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";

const editUserSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["artist", "group"], {
    message: "Selecione o tipo (Artista ou Grupo Cultural)",
  }),
  cpfCnpj: z.string().refine((value) => {
    const cleanValue = value.replace(/\D/g, "");
    return cleanValue.length === 11 || cleanValue.length === 14;
  }, "CPF ou CNPJ inválido"),
  bio: z.string().optional(),
  areaOfExpertise: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.object({
    cep: z.string().refine((value) => {
      const cleanValue = value.replace(/\D/g, "");
      return cleanValue.length === 8;
    }, "CEP deve ter 8 dígitos"),
    logradouro: z.string().min(1, "Logradouro é obrigatório"),
    numero: z.string().min(1, "Número é obrigatório"),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Bairro é obrigatório"),
    cidade: z.string().min(1, "Cidade é obrigatória"),
    estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  }),
  bankDetails: z.object({
    bank_name: z.string().min(1, "Nome do banco é obrigatório"),
    account_type: z.enum(["corrente", "poupanca"]),
    agency: z.string().min(1, "Agência é obrigatória"),
    account_number: z.string().min(1, "Número da conta é obrigatório"),
    pix_key: z.string().optional(),
  }),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function EditUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const defaultTab = searchParams.get("section") || "personal";

  const { user, isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepStatus, setCepStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [uploadDialog, setUploadDialog] = useState<{
    type: "video" | "profile_picture" | "portfolio" | "related_files";
    file: File | null;
    preview: string | null;
    rotation: number;
  } | null>(null);
  const [viewDialog, setViewDialog] = useState<{
    type: string;
    data: string | null;
    isLoading: boolean;
    error: string | null;
  } | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "artist",
      cpfCnpj: "",
      bio: "",
      areaOfExpertise: "",
      birthDate: "",
      address: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "SP",
      },
      bankDetails: {
        bank_name: "",
        account_type: "corrente",
        agency: "",
        account_number: "",
        pix_key: "",
      },
    },
  });

  const originalValues = useState<EditUserFormData | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    const fetchUserData = async () => {
      if (!id) {
        setShouldRedirect("/search");
        return;
      }

      if (!user || !["admin", "secretary"].includes(user.role)) {
        setShouldRedirect("/login");
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          setShouldRedirect("/login");
          return;
        }

        setIsLoading(true);
        const response = await axios.get(`${BASE_URL}/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data;
        const formattedData = {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          cpfCnpj: userData.cpf_cnpj || "",
          bio: userData.bio || "",
          areaOfExpertise: userData.area_of_expertise || "",
          birthDate: userData.birth_date
            ? formatDateForInput(userData.birth_date)
            : "",
          address: {
            cep: userData.address?.cep || "",
            logradouro: userData.address?.logradouro || "",
            numero: userData.address?.numero || "",
            complemento: userData.address?.complemento || "",
            bairro: userData.address?.bairro || "",
            cidade: userData.address?.cidade || "",
            estado: userData.address?.estado || "SP",
          },
          bankDetails: {
            bank_name: userData.bank_details?.bank_name || "",
            account_type:
              (userData.bank_details?.account_type as
                | "corrente"
                | "poupanca") || "corrente",
            agency: userData.bank_details?.agency || "",
            account_number: userData.bank_details?.account_number || "",
            pix_key: userData.bank_details?.pix_key || "",
          },
        };

        form.reset(formattedData);
        originalValues[1](formattedData);

        if (userData.profile_picture) {
          setProfilePreview(
            `data:image/jpeg;base64,${userData.profile_picture}`
          );
        }
      } catch (error) {
        const errorMessage = axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Ocorreu um erro inesperado";
        toast({
          title: "Erro ao carregar usuário",
          description: errorMessage,
          variant: "destructive",
        });
        setShouldRedirect(`/users/${id}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [id, user, isAuthLoading, form]);

  useEffect(() => {
    if (shouldRedirect) {
      router.push(shouldRedirect);
      setShouldRedirect(null);
    }
  }, [shouldRedirect, router]);

  function formatDateForInput(dateString: string) {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .join("/");
  }

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    setCepStatus("loading");
    try {
      const response = await axios.get(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );
      const data = response.data;
      if (data.erro) {
        setCepStatus("error");
        toast({
          title: "CEP não encontrado",
          description:
            "Por favor, verifique o CEP ou preencha os campos manualmente.",
          variant: "destructive",
        });
        return;
      }

      form.setValue("address.cep", cep, { shouldValidate: true });
      form.setValue("address.logradouro", data.logradouro || "", {
        shouldValidate: true,
      });
      form.setValue("address.bairro", data.bairro || "", {
        shouldValidate: true,
      });
      form.setValue("address.cidade", data.localidade || "", {
        shouldValidate: true,
      });
      form.setValue("address.estado", data.uf || "SP", {
        shouldValidate: true,
      });

      setCepStatus("success");
      toast({
        title: "✅ Endereço preenchido com sucesso!",
        description: "Verifique os dados e ajuste se necessário.",
      });
    } catch (error) {
      setCepStatus("error");
      toast({
        title: "Erro ao buscar CEP",
        description: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado ao buscar o CEP",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const validateFileType = (
    file: File,
    type: "profile_picture" | "portfolio" | "video" | "related_files"
  ) => {
    const allowedTypes = {
      profile_picture: ["image/jpeg", "image/png", "image/jpg", "image/gif"],
      portfolio: ["application/pdf"],
      video: ["video/mp4", "video/webm", "video/ogg"],
      related_files: [] as string[], // Aceita qualquer tipo
    };

    if (allowedTypes[type].length === 0) return true; // related_files aceita qualquer tipo
    return allowedTypes[type].includes(file.type);
  };

  const handleFileChange = (
    type: "video" | "profile_picture" | "portfolio" | "related_files",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "❌ Arquivo muito grande",
          description: `O arquivo é muito grande. O limite é ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`,
          variant: "destructive",
        });
        return;
      }

      if (!validateFileType(file, type)) {
        toast({
          title: "❌ Tipo de arquivo inválido",
          description: `O arquivo deve ser do tipo: ${
            type === "profile_picture"
              ? "JPEG, PNG, JPG, GIF"
              : type === "portfolio"
              ? "PDF"
              : "MP4, WEBM, OGG"
          }.`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadDialog({
          type,
          file,
          preview: reader.result as string,
          rotation: 0,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadFile = async () => {
    if (!uploadDialog?.file) return;

    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const formData = new FormData();
      formData.append("file", uploadDialog.file);

      await axios.put(
        `${BASE_URL}/api/users/${id}/file/${uploadDialog.type}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (uploadDialog.type === "profile_picture") {
        setProfilePreview(uploadDialog.preview);
      }

      toast({
        title: "✅ Arquivo enviado com sucesso!",
        description: `${uploadDialog.type} atualizado.`,
      });

      setUploadDialog(null);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "❌ Erro ao enviar arquivo",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewFile = async (type: string) => {
    setViewDialog({ type, data: null, isLoading: true, error: null });
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const response = await axios.get(
        `${BASE_URL}/api/users/${id}/file/${type}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const base64Data = response.data.file;
      let dataUrl: string;

      if (type === "profile_picture") {
        dataUrl = `data:image/jpeg;base64,${base64Data}`;
      } else if (type === "portfolio") {
        dataUrl = `data:application/pdf;base64,${base64Data}`;
      } else if (type === "video") {
        dataUrl = `data:video/mp4;base64,${base64Data}`;
      } else {
        dataUrl = `data:application/octet-stream;base64,${base64Data}`;
      }

      setViewDialog(
        (prev) => prev && { ...prev, data: dataUrl, isLoading: false }
      );
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      setViewDialog(
        (prev) =>
          prev && {
            ...prev,
            isLoading: false,
            error: errorMessage,
          }
      );
      toast({
        title: `❌ Erro ao visualizar ${type}`,
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleRotateImage = () => {
    if (!uploadDialog) return;
    setUploadDialog({
      ...uploadDialog,
      rotation: (uploadDialog.rotation + 90) % 360,
    });
  };

  const handleClearFile = (type: string) => {
    if (type === "profile_picture") {
      setProfilePreview(null);
      // Opcional: Enviar uma requisição para o backend para limpar o arquivo
    }
    toast({
      title: "✅ Arquivo removido",
      description: `${type} foi removido. Salve para confirmar a alteração.`,
    });
  };

  const onSubmitPersonal = async (values: EditUserFormData) => {
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const formDataToSend = new FormData();
      formDataToSend.append("name", values.name);
      formDataToSend.append("email", values.email);
      formDataToSend.append("role", values.role);
      formDataToSend.append("cpf_cnpj", values.cpfCnpj.replace(/\D/g, ""));
      if (values.bio) formDataToSend.append("bio", values.bio);
      if (values.areaOfExpertise)
        formDataToSend.append("area_of_expertise", values.areaOfExpertise);
      if (values.birthDate) {
        formDataToSend.append(
          "birth_date",
          values.birthDate.split("/").reverse().join("-")
        );
      }

      await axios.put(`${BASE_URL}/api/users/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "✅ Dados pessoais atualizados com sucesso!",
        description: "As alterações foram salvas.",
      });

      originalValues[1](form.getValues());
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "❌ Erro ao atualizar dados pessoais",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitAddress = async (values: EditUserFormData) => {
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const formDataToSend = new FormData();
      const address = {
        cep: values.address.cep.replace(/\D/g, ""),
        logradouro: values.address.logradouro,
        numero: values.address.numero,
        complemento: values.address.complemento || "",
        bairro: values.address.bairro,
        cidade: values.address.cidade,
        estado: values.address.estado,
      };
      formDataToSend.append("address", JSON.stringify(address));

      await axios.put(`${BASE_URL}/api/users/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "✅ Endereço atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });

      originalValues[1](form.getValues());
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "❌ Erro ao atualizar endereço",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitBank = async (values: EditUserFormData) => {
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const formDataToSend = new FormData();
      const bankDetails = {
        bank_name: values.bankDetails.bank_name,
        account_type: values.bankDetails.account_type,
        agency: values.bankDetails.agency,
        account_number: values.bankDetails.account_number,
        pix_key: values.bankDetails.pix_key || "",
      };
      formDataToSend.append("bank_details", JSON.stringify(bankDetails));

      await axios.put(`${BASE_URL}/api/users/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "✅ Dados bancários atualizados com sucesso!",
        description: "As alterações foram salvas.",
      });

      originalValues[1](form.getValues());
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "❌ Erro ao atualizar dados bancários",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (originalValues[0]) {
      form.reset(originalValues[0]);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }
      await axios.delete(`${BASE_URL}/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Usuário deletado com sucesso" });
      router.push("/search");
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "Erro ao deletar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }
      await axios.put(
        `${BASE_URL}/api/users/${id}/password`,
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: "Senha alterada com sucesso" });
      setShowPasswordDialog(false);
      setNewPassword("");
      setPasswordError(null);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "Erro ao alterar senha",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "✅ Copiado!",
        description: "ID copiado para a área de transferência.",
      });
    });
  };

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <Card className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 relative">
                {profilePreview ? (
                  <Image
                    src={profilePreview}
                    alt="Foto de perfil"
                    fill
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="h-16 w-16 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {form.getValues("name")}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>ID: {id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(id!)}
                    className="hover:bg-muted/20 transition-all duration-300"
                    aria-label="Copiar ID do usuário"
                  >
                    <Copy className="w-4 h-4 text-primary" />
                  </Button>
                </div>
                <span
                  className={`text-sm px-2 py-1 rounded-full mt-1 ${
                    form.getValues("role") === "artist"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {form.getValues("role") === "artist" ? "Artista" : "Grupo"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => router.push(`/users/${id}`)}
                variant="outline"
                className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                aria-label="Voltar para detalhes do usuário"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-primary" />
                Voltar
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowPasswordDialog(true)}
                className="bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300 active:scale-95"
                aria-label="Alterar senha do usuário"
              >
                Alterar Senha
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95"
                aria-label="Deletar usuário"
              >
                Deletar Usuário
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Abas */}
        <FormProvider {...form}>
          <Card className="mt-6 bg-muted shadow-sm rounded-lg animate-in fade-in duration-500">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 border-b bg-background overflow-x-auto">
                <TabsTrigger
                  value="personal"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-sm py-2"
                >
                  Dados pessoais
                </TabsTrigger>
                <TabsTrigger
                  value="portfolio"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-sm py-2"
                >
                  Portfólio
                </TabsTrigger>
                <TabsTrigger
                  value="address"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-sm py-2"
                >
                  Endereço
                </TabsTrigger>
                <TabsTrigger
                  value="bank"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-sm py-2"
                >
                  Dados bancários
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-sm py-2"
                >
                  Eventos
                </TabsTrigger>
              </TabsList>

              {/* Aba: Dados Pessoais */}
              <TabsContent value="personal" className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
                  Dados pessoais
                </h2>
                <Separator className="my-4 bg-muted-foreground/20" />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-5 h-5 text-primary" />
                          Nome Completo <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nome completo"
                            {...field}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                            aria-label="Nome completo do usuário"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-5 h-5 text-primary" />
                          Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="seu@email.com"
                            {...field}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                            aria-label="Email do usuário"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-5 h-5 text-primary" />
                          Tipo de Cadastro{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Selecione o tipo de cadastro"
                            >
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="artist">
                              Artista Individual
                            </SelectItem>
                            <SelectItem value="group">
                              Grupo Cultural
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpfCnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          {form.getValues("role") === "artist" ? "CPF" : "CNPJ"}{" "}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask={
                              form.getValues("role") === "artist"
                                ? "000.000.000-00"
                                : "00.000.000/0000-00"
                            }
                            placeholder={
                              form.getValues("role") === "artist"
                                ? "000.000.000-00"
                                : "00.000.000/0000-00"
                            }
                            {...field}
                            onAccept={(value) => field.onChange(value)}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 pl-10"
                            aria-label={
                              form.getValues("role") === "artist"
                                ? "CPF do artista"
                                : "CNPJ do grupo cultural"
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-5 h-5 text-primary" />
                          Data de Nascimento
                        </FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask="00/00/0000"
                            placeholder="DD/MM/YYYY"
                            {...field}
                            onAccept={(value) => field.onChange(value)}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 pl-10"
                            aria-label="Data de nascimento"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Biografia
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Conte sobre o artista/grupo..."
                            {...field}
                            value={field.value || ""}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                            aria-label="Biografia do artista ou grupo"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="areaOfExpertise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Área de Atuação
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Música, Teatro, Dança"
                            {...field}
                            value={field.value || ""}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                            aria-label="Área de atuação"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 sm:gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                    aria-label="Cancelar edições"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmitPersonal)}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                    aria-label="Salvar edições"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar edições"
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Aba: Portfólio */}
              <TabsContent value="portfolio" className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
                  Portfólio
                </h2>
                <Separator className="my-4 bg-muted-foreground/20" />
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Foto de perfil
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300"
                        onClick={() =>
                          document
                            .getElementById("profile_picture_input")
                            ?.click()
                        }
                        aria-label="Alterar foto de perfil"
                      >
                        Alterar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300"
                        onClick={() => handleViewFile("profile_picture")}
                        disabled={!profilePreview}
                        aria-label="Visualizar foto de perfil"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      {profilePreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all duration-300"
                          onClick={() => handleClearFile("profile_picture")}
                          aria-label="Remover foto de perfil"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      )}
                      <input
                        id="profile_picture_input"
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/gif"
                        onChange={(e) => handleFileChange("profile_picture", e)}
                        className="hidden"
                        aria-label="Selecionar nova foto de perfil"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Portfólio (PDF)
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300"
                        onClick={() =>
                          document.getElementById("portfolio_input")?.click()
                        }
                        aria-label="Alterar portfólio"
                      >
                        Alterar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300"
                        onClick={() => handleViewFile("portfolio")}
                        aria-label="Visualizar portfólio"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <input
                        id="portfolio_input"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileChange("portfolio", e)}
                        className="hidden"
                        aria-label="Selecionar novo portfólio"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      Vídeo
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300"
                        onClick={() =>
                          document.getElementById("video_input")?.click()
                        }
                        aria-label="Alterar vídeo"
                      >
                        Alterar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300"
                        onClick={() => handleViewFile("video")}
                        aria-label="Visualizar vídeo"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <input
                        id="video_input"
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        onChange={(e) => handleFileChange("video", e)}
                        className="hidden"
                        aria-label="Selecionar novo vídeo"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Arquivos relacionados
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300"
                        onClick={() =>
                          document
                            .getElementById("related_files_input")
                            ?.click()
                        }
                        aria-label="Alterar arquivos relacionados"
                      >
                        Alterar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300"
                        onClick={() => handleViewFile("related_files")}
                        aria-label="Visualizar arquivos relacionados"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </Button>
                      <input
                        id="related_files_input"
                        type="file"
                        onChange={(e) => handleFileChange("related_files", e)}
                        className="hidden"
                        aria-label="Selecionar novos arquivos relacionados"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Aba: Endereço */}
              <TabsContent value="address" className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
                  Endereço
                </h2>
                <Separator className="my-4 bg-muted-foreground/20" />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address.cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-5 h-5 text-primary" />
                          CEP <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask="00000-000"
                            placeholder="00000-000"
                            defaultValue={field.value}
                            onAccept={(value) => {
                              field.onChange(value);
                              const cleanValue = value.replace(/\D/g, "");
                              if (cleanValue.length === 8) {
                                fetchAddressByCep(value);
                              }
                            }}
                            onBlur={() => form.trigger("address.cep")}
                            disabled={isLoadingCep || isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 pl-10"
                            aria-label="CEP do endereço"
                          />
                        </FormControl>
                        <div className="text-sm mt-1">
                          {cepStatus === "loading" && (
                            <p className="text-muted-foreground flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Buscando endereço...
                            </p>
                          )}
                          {cepStatus === "success" && (
                            <p className="text-green-600">
                              Endereço preenchido com sucesso!
                            </p>
                          )}
                          {cepStatus === "error" && (
                            <p className="text-red-600">
                              Não foi possível buscar o endereço.
                            </p>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address.logradouro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Logradouro <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Logradouro do endereço"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address.numero"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Número <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Número do endereço"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address.complemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Complemento
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                            aria-label="Complemento do endereço"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="address.bairro"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Bairro <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Bairro do endereço"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address.cidade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Cidade <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Cidade do endereço"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address.estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Estado (UF) <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Selecione o estado"
                            >
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BRAZILIAN_STATES.map((uf) => (
                              <SelectItem key={uf} value={uf}>
                                {uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 sm:gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                    aria-label="Cancelar edições"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmitAddress)}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                    aria-label="Salvar edições"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar edições"
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Aba: Dados Bancários */}
              <TabsContent value="bank" className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
                  Dados bancários
                </h2>
                <Separator className="my-4 bg-muted-foreground/20" />
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bankDetails.bank_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="w-5 h-5 text-primary" />
                          Nome do Banco <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 pl-10"
                            aria-label="Nome do banco"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankDetails.account_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Tipo de Conta{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                                aria-label="Selecione o tipo de conta"
                              >
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="corrente">
                                Conta Corrente
                              </SelectItem>
                              <SelectItem value="poupanca">
                                Conta Poupança
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankDetails.agency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Agência <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Número da agência"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankDetails.account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Número da Conta{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Número da conta bancária"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankDetails.pix_key"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">
                            Chave PIX
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                              aria-label="Chave PIX"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 sm:gap-4 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                    aria-label="Cancelar edições"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmitBank)}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95"
                    aria-label="Salvar edições"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar edições"
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Aba: Eventos */}
              <TabsContent value="events" className="p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
                  Eventos
                </h2>
                <Separator className="my-4 bg-muted-foreground/20" />
                <p className="text-muted-foreground">
                  Lista de eventos será implementada aqui (requer endpoint
                  `/api/users/:id/events`).
                </p>
              </TabsContent>
            </Tabs>
          </Card>
        </FormProvider>

        {/* Modal de Upload de Arquivo */}
        {uploadDialog && (
          <Dialog
            open={!!uploadDialog}
            onOpenChange={() => setUploadDialog(null)}
          >
            <DialogContent className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500 max-w-[90vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Alterar{" "}
                  {uploadDialog.type === "profile_picture"
                    ? "Foto de Perfil"
                    : uploadDialog.type === "portfolio"
                    ? "Portfólio"
                    : uploadDialog.type === "video"
                    ? "Vídeo"
                    : "Arquivos Relacionados"}
                </DialogTitle>
              </DialogHeader>
              {uploadDialog.preview && (
                <div className="my-4">
                  {uploadDialog.type === "profile_picture" ? (
                    <div className="relative w-full h-64">
                      <Image
                        src={uploadDialog.preview}
                        alt="Pré-visualização"
                        fill
                        className="object-contain"
                        style={{
                          transform: `rotate(${uploadDialog.rotation}deg)`,
                        }}
                      />
                    </div>
                  ) : uploadDialog.type === "portfolio" ? (
                    <iframe
                      src={uploadDialog.preview}
                      className="w-full h-96"
                      title="Pré-visualização do PDF"
                    />
                  ) : uploadDialog.type === "video" ? (
                    <video controls className="w-full h-auto">
                      <source src={uploadDialog.preview} type="video/mp4" />
                      Seu navegador não suporta o elemento de vídeo.
                    </video>
                  ) : (
                    <p className="text-muted-foreground">
                      Arquivo selecionado: {uploadDialog.file?.name}
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-between mt-4">
                <Input
                  type="file"
                  accept={
                    uploadDialog.type === "profile_picture"
                      ? "image/jpeg,image/png,image/jpg,image/gif"
                      : uploadDialog.type === "portfolio"
                      ? "application/pdf"
                      : uploadDialog.type === "video"
                      ? "video/mp4,video/webm,video/ogg"
                      : "*/*"
                  }
                  onChange={(e) => handleFileChange(uploadDialog.type, e)}
                  disabled={isSubmitting}
                  className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 w-full sm:w-auto"
                  aria-label={`Selecionar novo arquivo para ${uploadDialog.type}`}
                />
                {uploadDialog.type === "profile_picture" && (
                  <Button
                    variant="outline"
                    onClick={handleRotateImage}
                    className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                    aria-label="Girar imagem"
                  >
                    <RotateCw className="w-4 h-4 mr-2 text-primary" />
                    Girar
                  </Button>
                )}
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setUploadDialog(null)}
                  disabled={isSubmitting}
                  className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 w-full sm:w-auto"
                  aria-label="Cancelar upload"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUploadFile}
                  disabled={isSubmitting || !uploadDialog.file}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 w-full sm:w-auto"
                  aria-label="Enviar arquivo"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar arquivo"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal de Visualização de Arquivo */}
        {viewDialog && (
          <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
            <DialogContent className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500 max-w-[90vw] sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Visualizar{" "}
                  {viewDialog.type === "profile_picture"
                    ? "Foto de Perfil"
                    : viewDialog.type === "portfolio"
                    ? "Portfólio"
                    : viewDialog.type === "video"
                    ? "Vídeo"
                    : "Arquivos Relacionados"}
                </DialogTitle>
              </DialogHeader>
              {viewDialog.isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : viewDialog.error ? (
                <div className="text-red-600 text-center py-4">
                  {viewDialog.error}
                </div>
              ) : viewDialog.data ? (
                <div className="my-4">
                  {viewDialog.type === "profile_picture" ? (
                    <div className="relative w-full h-64">
                      <Image
                        src={viewDialog.data}
                        alt="Foto de perfil"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : viewDialog.type === "portfolio" ? (
                    <iframe
                      src={viewDialog.data}
                      className="w-full h-[60vh]"
                      title="Visualização do PDF"
                    />
                  ) : viewDialog.type === "video" ? (
                    <video controls className="w-full h-auto">
                      <source src={viewDialog.data} type="video/mp4" />
                      Seu navegador não suporta o elemento de vídeo.
                    </video>
                  ) : (
                    <div className="text-center">
                      <p className="text-muted-foreground mb-4">
                        Arquivo relacionado
                      </p>
                      <a
                        href={viewDialog.data}
                        download="related_file"
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all duration-300"
                      >
                        Baixar Arquivo
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  Nenhum arquivo disponível para visualização.
                </div>
              )}
              <DialogFooter className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setViewDialog(null)}
                  className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
                  aria-label="Fechar visualização"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Diálogo de Confirmação para Deletar */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                Confirmar exclusão
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Tem certeza que deseja deletar este usuário? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 w-full sm:w-auto">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95 w-full sm:w-auto"
                aria-label="Confirmar exclusão do usuário"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo para Alterar Senha */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500 max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                Alterar Senha
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Nova senha"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (e.target.value.length < 6) {
                    setPasswordError(
                      "A senha deve ter pelo menos 6 caracteres"
                    );
                  } else {
                    setPasswordError(null);
                  }
                }}
                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300"
                aria-label="Nova senha do usuário"
              />
              {passwordError && (
                <p className="text-red-600 text-sm">{passwordError}</p>
              )}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleChangePassword}
                disabled={!!passwordError || newPassword.length === 0}
                className="bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300 active:scale-95 w-full sm:w-auto"
                aria-label="Salvar nova senha"
              >
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setNewPassword("");
                  setPasswordError(null);
                }}
                className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 w-full sm:w-auto"
                aria-label="Cancelar alteração de senha"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
