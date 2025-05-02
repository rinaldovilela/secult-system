"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import * as z from "zod";
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
  EyeIcon,
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
import { Combobox } from "@/components/ui/combobox";
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
import { Card, CardHeader } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress"; // Novo componente para progresso
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Novo componente para tooltips
import { getToken } from "@/lib/auth";
import { useDebounce } from "@/hooks/useDebounce";
import React from "react";

// Esquema de validação
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

// Novo componente ErrorSummary
const ErrorSummary = ({ errors }: { errors: Record<string, any> }) => {
  const errorMessages = Object.entries(errors)
    .filter(([_, error]) => error?.message)
    .map(([field, error]) => ({
      field: field.replace(
        /\.([a-z])/g,
        (_, letter) => ` ${letter.toUpperCase()}`
      ),
      message: error.message,
    }));

  if (errorMessages.length === 0) return null;

  return (
    <div
      role="alert"
      className="bg-red-100 text-red-800 p-4 rounded-md mb-4 space-y-2"
      aria-live="assertive"
    >
      <h3 className="font-semibold">Erros de validação:</h3>
      <ul className="list-disc pl-5">
        {errorMessages.map(({ field, message }, index) => (
          <li key={index} className="text-sm">
            <strong>{field}:</strong> {message}
          </li>
        ))}
      </ul>
    </div>
  );
};

const EditUserContent = () => {
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false); // Novo estado para visualização de alterações
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0); // Novo estado para progresso de upload
  const [uploadDialog, setUploadDialog] = useState<{
    type: "video" | "profile_picture" | "portfolio" | "related_files";
    files: File[]; // Alterado para suportar múltiplos arquivos
    previews: string[];
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

  const [originalValues, setOriginalValues] = useState<EditUserFormData | null>(
    null
  );

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        form.handleSubmit((values) => {
          if (defaultTab === "personal") onSubmitPersonal(values);
          else if (defaultTab === "address") onSubmitAddress(values);
          else if (defaultTab === "bank") onSubmitBank(values);
        })();
      }
      if (e.key === "Escape") {
        handleCancel();
      }
      if (e.ctrlKey && e.key === "v") {
        e.preventDefault();
        setShowPreviewDialog(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, defaultTab]);

  // Carregar dados do usuário
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
        setOriginalValues(formattedData);

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

  const formatDateForInput = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .join("/");
  }, []);

  const fetchAddressByCep = useCallback(
    async (cep: string | undefined) => {
      if (!cep || typeof cep !== "string") {
        setCepStatus("error");
        return;
      }

      const cleanCep = cep.replace(/\D/g, "");
      if (cleanCep.length !== 8) {
        setCepStatus("error");
        return;
      }

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
    },
    [form]
  );

  const debouncedFetchAddress = useDebounce(fetchAddressByCep, 500);

  const validateFileType = useCallback(
    (
      file: File,
      type: "profile_picture" | "portfolio" | "video" | "related_files"
    ) => {
      const allowedTypes = {
        profile_picture: ["image/jpeg", "image/png", "image/jpg", "image/gif"],
        portfolio: ["application/pdf"],
        video: ["video/mp4", "video/webm", "video/ogg"],
        related_files: [], // Aceita qualquer tipo
      };
      return (
        allowedTypes[type].length === 0 ||
        (allowedTypes[type] as string[]).includes(file.type)
      );
    },
    []
  );

  const handleFileChange = useCallback(
    (
      type: "video" | "profile_picture" | "portfolio" | "related_files",
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const validFiles: File[] = [];
      const previews: string[] = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "❌ Arquivo muito grande",
            description: `O arquivo ${file.name} é muito grande. O limite é ${
              MAX_FILE_SIZE / (1024 * 1024)
            }MB.`,
            variant: "destructive",
          });
          return;
        }

        if (!validateFileType(file, type)) {
          toast({
            title: "❌ Tipo de arquivo inválido",
            description: `O arquivo ${file.name} deve ser do tipo: ${
              type === "profile_picture"
                ? "JPEG, PNG, JPG, GIF"
                : type === "portfolio"
                ? "PDF"
                : type === "video"
                ? "MP4, WEBM, OGG"
                : "qualquer"
            }.`,
            variant: "destructive",
          });
          return;
        }

        validFiles.push(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === validFiles.length) {
            setUploadDialog({
              type,
              files: validFiles,
              previews,
              rotation: 0,
            });
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [validateFileType]
  );

  const handleUploadFile = useCallback(async () => {
    if (!uploadDialog?.files.length) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Token não encontrado. Faça login novamente.");
      }

      const formData = new FormData();
      uploadDialog.files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      await axios.put(
        `${BASE_URL}/api/users/${id}/file/${uploadDialog.type}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          },
        }
      );

      if (uploadDialog.type === "profile_picture" && uploadDialog.previews[0]) {
        setProfilePreview(uploadDialog.previews[0]);
      }

      toast({
        title: "✅ Arquivo(s) enviado(s) com sucesso!",
        description: `${uploadDialog.type} atualizado.`,
      });

      setUploadDialog(null);
      setUploadProgress(0);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "❌ Erro ao enviar arquivo(s)",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [uploadDialog, id]);

  const handleViewFile = useCallback(
    async (type: string) => {
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
          (prev) => prev && { ...prev, isLoading: false, error: errorMessage }
        );
        toast({
          title: `❌ Erro ao visualizar ${type}`,
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [id]
  );

  const handleRotateImage = useCallback(() => {
    if (!uploadDialog) return;
    setUploadDialog({
      ...uploadDialog,
      rotation: (uploadDialog.rotation + 90) % 360,
    });
  }, [uploadDialog]);

  const handleClearFile = useCallback((type: string) => {
    if (type === "profile_picture") {
      setProfilePreview(null);
    }
    toast({
      title: "✅ Arquivo removido",
      description: `${type} foi removido. Salve para confirmar a alteração.`,
    });
  }, []);

  const onSubmitPersonal = useCallback(
    async (values: EditUserFormData) => {
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

        setOriginalValues(form.getValues());
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
    },
    [form, id]
  );

  const onSubmitAddress = useCallback(
    async (values: EditUserFormData) => {
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

        setOriginalValues(form.getValues());
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
    },
    [form, id]
  );

  const onSubmitBank = useCallback(
    async (values: EditUserFormData) => {
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

        setOriginalValues(form.getValues());
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
    },
    [form, id]
  );

  const handleCancel = useCallback(() => {
    if (form.formState.isDirty) {
      setShowCancelDialog(true);
    } else {
      if (originalValues) {
        form.reset(originalValues);
      }
    }
  }, [form, originalValues]);

  const handleDeleteUser = useCallback(async () => {
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
  }, [id, router]);

  const handleChangePassword = useCallback(async () => {
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
  }, [id, newPassword]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "✅ Copiado!",
        description: "ID copiado para a área de transferência.",
      });
    });
  }, []);

  // Novo: Função para comparar alterações
  const getChanges = () => {
    if (!originalValues) return [];
    const currentValues = form.getValues();
    const changes: { field: string; oldValue: string; newValue: string }[] = [];

    const compareField = (field: string, oldVal: any, newVal: any) => {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field,
          oldValue: oldVal || "",
          newValue: newVal || "",
        });
      }
    };

    compareField("Nome", originalValues.name, currentValues.name);
    compareField("Email", originalValues.email, currentValues.email);
    compareField("Tipo", originalValues.role, currentValues.role);
    compareField("CPF/CNPJ", originalValues.cpfCnpj, currentValues.cpfCnpj);
    compareField("Bio", originalValues.bio, currentValues.bio);
    compareField(
      "Área de Atuação",
      originalValues.areaOfExpertise,
      currentValues.areaOfExpertise
    );
    compareField(
      "Data de Nascimento",
      originalValues.birthDate,
      currentValues.birthDate
    );
    compareField("CEP", originalValues.address.cep, currentValues.address.cep);
    compareField(
      "Logradouro",
      originalValues.address.logradouro,
      currentValues.address.logradouro
    );
    compareField(
      "Número",
      originalValues.address.numero,
      currentValues.address.numero
    );
    compareField(
      "Complemento",
      originalValues.address.complemento,
      currentValues.address.complemento
    );
    compareField(
      "Bairro",
      originalValues.address.bairro,
      currentValues.address.bairro
    );
    compareField(
      "Cidade",
      originalValues.address.cidade,
      currentValues.address.cidade
    );
    compareField(
      "Estado",
      originalValues.address.estado,
      currentValues.address.estado
    );
    compareField(
      "Banco",
      originalValues.bankDetails.bank_name,
      currentValues.bankDetails.bank_name
    );
    compareField(
      "Tipo de Conta",
      originalValues.bankDetails.account_type,
      currentValues.bankDetails.account_type
    );
    compareField(
      "Agência",
      originalValues.bankDetails.agency,
      currentValues.bankDetails.agency
    );
    compareField(
      "Número da Conta",
      originalValues.bankDetails.account_number,
      currentValues.bankDetails.account_number
    );
    compareField(
      "Chave PIX",
      originalValues.bankDetails.pix_key,
      currentValues.bankDetails.pix_key
    );

    return changes;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-4xl space-y-4 px-4">
          <div className="h-16 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          {/* Cabeçalho */}
          <Card className="bg-muted shadow-sm rounded-lg animate-in fade-in duration-500">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 relative">
                  {profilePreview ? (
                    <Image
                      src={profilePreview}
                      alt="Foto de perfil"
                      fill
                      className="object-cover rounded-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-muted-foreground/20 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">
                    {form.getValues("name")}
                  </h1>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>ID: {id}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(id!)}
                          className="hover:bg-muted/20 transition-all duration-300"
                          aria-label="Copiar ID do usuário para a área de transferência"
                        >
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Copiar ID para a área de transferência
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span
                    className={`text-xs sm:text-sm px-2 py-1 rounded-full mt-1 ${
                      form.getValues("role") === "artist"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {form.getValues("role") === "artist" ? "Artista" : "Grupo"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => router.push(`/users/${id}`)}
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                      aria-label="Voltar para detalhes do usuário"
                    >
                      <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-primary" />
                      Voltar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Voltar para detalhes do usuário
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowPasswordDialog(true)}
                      className="flex-1 sm:flex-none bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-300 active:scale-95 px-4 py-2"
                      aria-label="Alterar senha do usuário"
                    >
                      Alterar Senha
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alterar senha do usuário</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95 px-4 py-2"
                      aria-label="Deletar usuário"
                    >
                      Deletar Usuário
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Deletar usuário permanentemente
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
          </Card>

          {/* Abas */}
          <FormProvider {...form}>
            <Card className="mt-6 bg-muted shadow-sm rounded-lg animate-in fade-in duration-500">
              {/* Error Summary */}
              <ErrorSummary errors={form.formState.errors} />

              <div className="sm:hidden">
                <Select
                  value={defaultTab}
                  onValueChange={(value) =>
                    router.push(`/users/edit?id=${id}&section=${value}`)
                  }
                >
                  <SelectTrigger
                    className="w-full rounded-md border-muted-foreground/20 bg-background focus:ring-primary transition-all duration-300"
                    aria-label="Selecione uma seção"
                  >
                    <SelectValue placeholder="Selecione uma seção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Dados pessoais</SelectItem>
                    <SelectItem value="portfolio">Portfólio</SelectItem>
                    <SelectItem value="address">Endereço</SelectItem>
                    <SelectItem value="bank">Dados bancários</SelectItem>
                    <SelectItem value="events">Eventos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="hidden sm:grid sm:grid-cols-5 gap-2 p-2 border-b bg-background">
                  <TabsTrigger
                    value="personal"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2 px-3"
                  >
                    Dados pessoais
                  </TabsTrigger>
                  <TabsTrigger
                    value="portfolio"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2 px-3"
                  >
                    Portfólio
                  </TabsTrigger>
                  <TabsTrigger
                    value="address"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2 px-3"
                  >
                    Endereço
                  </TabsTrigger>
                  <TabsTrigger
                    value="bank"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2 px-3"
                  >
                    Dados bancários
                  </TabsTrigger>
                  <TabsTrigger
                    value="events"
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2 px-3"
                  >
                    Eventos
                  </TabsTrigger>
                </TabsList>

                {/* Aba: Dados Pessoais */}
                <TabsContent value="personal" className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-2xl font-semibold tracking-tight mb-4">
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
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Nome Completo{" "}
                            <span className="text-red-500 font-bold">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome completo"
                              {...field}
                              maxLength={255}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="name-error"
                              aria-label="Nome completo do usuário"
                            />
                          </FormControl>
                          <FormMessage id="name-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Email{" "}
                            <span className="text-red-500 font-bold">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              {...field}
                              maxLength={255}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="email-error"
                              aria-label="Email do usuário"
                            />
                          </FormControl>
                          <FormMessage id="email-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Tipo de Cadastro{" "}
                            <span className="text-red-500 font-bold">*</span>
                          </FormLabel>
                          <div
                            className={
                              isSubmitting
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          >
                            <Combobox
                              options={[
                                {
                                  value: "artist",
                                  label: "Artista Individual",
                                },
                                { value: "group", label: "Grupo Cultural" },
                              ]}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecione o tipo"
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="role-error"
                              aria-label="Selecione o tipo de cadastro"
                            />
                          </div>
                          <FormMessage id="role-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            {form.getValues("role") === "artist"
                              ? "CPF"
                              : "CNPJ"}{" "}
                            <span className="text-red-500 font-bold">*</span>
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
                              onAccept={(value) => {
                                field.onChange(value);
                                form.trigger("cpfCnpj");
                              }}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 pl-10 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="cpfCnpj-error"
                              aria-label={
                                form.getValues("role") === "artist"
                                  ? "CPF do artista"
                                  : "CNPJ do grupo cultural"
                              }
                            />
                          </FormControl>
                          <FormMessage id="cpfCnpj-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Data de Nascimento
                          </FormLabel>
                          <FormControl>
                            <MaskedInput
                              mask="00/00/0000"
                              placeholder="DD/MM/YYYY"
                              {...field}
                              onAccept={(value) => field.onChange(value)}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 pl-10 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="birthDate-error"
                              aria-label="Data de nascimento"
                            />
                          </FormControl>
                          <FormMessage id="birthDate-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-sm sm:text-base">
                            Biografia
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Conte sobre o artista/grupo..."
                              {...field}
                              value={field.value || ""}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="bio-error"
                              aria-label="Biografia do artista ou grupo"
                            />
                          </FormControl>
                          <FormMessage id="bio-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="areaOfExpertise"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-sm sm:text-base">
                            Área de Atuação
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Música, Teatro, Dança"
                              {...field}
                              value={field.value || ""}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="areaOfExpertise-error"
                              aria-label="Área de atuação"
                            />
                          </FormControl>
                          <FormMessage id="areaOfExpertise-error" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                          aria-label="Cancelar edições"
                        >
                          Cancelar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Descartar alterações não salvas
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => setShowPreviewDialog(true)}
                          disabled={isSubmitting || !form.formState.isDirty}
                          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 active:scale-95 px-4 py-2"
                          aria-label="Visualizar alterações"
                        >
                          Visualizar Alterações
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ver alterações antes de salvar
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={form.handleSubmit(onSubmitPersonal)}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
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
                      </TooltipTrigger>
                      <TooltipContent>
                        Salvar alterações (Ctrl+S)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TabsContent>

                {/* Aba: Portfólio */}
                <TabsContent value="portfolio" className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-2xl font-semibold tracking-tight mb-4">
                    Portfólio
                  </h2>
                  <Separator className="my-4 bg-muted-foreground/20" />
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <span className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        Foto de perfil
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 px-4 py-2"
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
                          className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300 px-4 py-2"
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
                            className="border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all duration-300 px-4 py-2"
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
                          onChange={(e) =>
                            handleFileChange("profile_picture", e)
                          }
                          className="hidden"
                          aria-label="Selecionar nova foto de perfil"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <span className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        Portfólio (PDF)
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 px-4 py-2"
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
                          className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300 px-4 py-2"
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <span className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        Vídeo
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 px-4 py-2"
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
                          className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300 px-4 py-2"
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
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <span className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        Arquivos relacionados
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-primary/20 hover:bg-primary/10 text-primary transition-all duration-300 px-4 py-2"
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
                          className="border-blue-500/20 hover:bg-blue-500/10 text-blue-500 transition-all duration-300 px-4 py-2"
                          onClick={() => handleViewFile("related_files")}
                          aria-label="Visualizar arquivos relacionados"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                        <input
                          id="related_files_input"
                          type="file"
                          multiple // Suporte a múltiplos arquivos
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
                  <h2 className="text-lg sm:text-2xl font-semibold tracking-tight mb-4">
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
                            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            CEP{" "}
                            <span className="text-red-500 font-bold">*</span>
                          </FormLabel>
                          <FormControl>
                            <MaskedInput
                              mask="00000-000"
                              placeholder="00000-000"
                              defaultValue={field.value}
                              onAccept={(value) => {
                                field.onChange(value);
                                if (
                                  value &&
                                  value.replace(/\D/g, "").length === 8
                                ) {
                                  debouncedFetchAddress(value);
                                } else {
                                  setCepStatus("idle");
                                }
                              }}
                              onBlur={() => form.trigger("address.cep")}
                              disabled={isLoadingCep || isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="cep-error"
                              aria-label="CEP do endereço"
                            />
                          </FormControl>
                          <div className="text-xs sm:text-sm mt-1">
                            {cepStatus === "loading" && (
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
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
                          <FormMessage id="cep-error" />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address.logradouro"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Logradouro{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="logradouro-error"
                                aria-label="Logradouro do endereço"
                              />
                            </FormControl>
                            <FormMessage id="logradouro-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address.numero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Número{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="numero-error"
                                aria-label="Número do endereço"
                              />
                            </FormControl>
                            <FormMessage id="numero-error" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address.complemento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-sm sm:text-base">
                            Complemento
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="complemento-error"
                              aria-label="Complemento do endereço"
                            />
                          </FormControl>
                          <FormMessage id="complemento-error" />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address.bairro"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Bairro{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="bairro-error"
                                aria-label="Bairro do endereço"
                              />
                            </FormControl>
                            <FormMessage id="bairro-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address.cidade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Cidade{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="cidade-error"
                                aria-label="Cidade do endereço"
                              />
                            </FormControl>
                            <FormMessage id="cidade-error" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address.estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground text-sm sm:text-base">
                            Estado (UF){" "}
                            <span className="text-red-500 font-bold">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
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
                          <FormMessage id="estado-error" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                          aria-label="Cancelar edições"
                        >
                          Cancelar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Descartar alterações não salvas
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => setShowPreviewDialog(true)}
                          disabled={isSubmitting || !form.formState.isDirty}
                          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 active:scale-95 px-4 py-2"
                          aria-label="Visualizar alterações"
                        >
                          Visualizar Alterações
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ver alterações antes de salvar
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={form.handleSubmit(onSubmitAddress)}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
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
                      </TooltipTrigger>
                      <TooltipContent>
                        Salvar alterações (Ctrl+S)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TabsContent>

                {/* Aba: Dados Bancários */}
                <TabsContent value="bank" className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-2xl font-semibold tracking-tight mb-4">
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
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Nome do Banco{" "}
                            <span className="text-red-500 font-bold">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={isSubmitting}
                              className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                              aria-describedby="bank_name-error"
                              aria-label="Nome do banco"
                            />
                          </FormControl>
                          <FormMessage id="bank_name-error" />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bankDetails.account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Tipo de Conta{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger
                                  className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
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
                            <FormMessage id="account_type-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankDetails.agency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Agência{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="agency-error"
                                aria-label="Número da agência"
                              />
                            </FormControl>
                            <FormMessage id="agency-error" />
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
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Número da Conta{" "}
                              <span className="text-red-500 font-bold">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="account_number-error"
                                aria-label="Número da conta bancária"
                              />
                            </FormControl>
                            <FormMessage id="account_number-error" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bankDetails.pix_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-muted-foreground text-sm sm:text-base">
                              Chave PIX
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                disabled={isSubmitting}
                                className="bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                                aria-describedby="pix_key-error"
                                aria-label="Chave PIX"
                              />
                            </FormControl>
                            <FormMessage id="pix_key-error" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                          aria-label="Cancelar edições"
                        >
                          Cancelar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Descartar alterações não salvas
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={() => setShowPreviewDialog(true)}
                          disabled={isSubmitting || !form.formState.isDirty}
                          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 active:scale-95 px-4 py-2"
                          aria-label="Visualizar alterações"
                        >
                          Visualizar Alterações
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Ver alterações antes de salvar
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={form.handleSubmit(onSubmitBank)}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
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
                      </TooltipTrigger>
                      <TooltipContent>
                        Salvar alterações (Ctrl+S)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TabsContent>

                {/* Aba: Eventos */}
                <TabsContent value="events" className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-2xl font-semibold tracking-tight mb-4">
                    Eventos
                  </h2>
                  <Separator className="my-4 bg-muted-foreground/20" />
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Nenhum evento associado a este usuário.
                  </p>
                </TabsContent>
              </Tabs>
            </Card>
          </FormProvider>

          {/* Modal de Visualização de Alterações */}
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-semibold">
                  Visualizar Alterações
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {getChanges().length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-semibold">
                      Alterações realizadas:
                    </h3>
                    <ul className="list-disc pl-5 space-y-2">
                      {getChanges().map((change, index) => (
                        <li key={index} className="text-sm sm:text-base">
                          <strong>{change.field}:</strong> De "
                          {change.oldValue || "N/A"}" para "
                          {change.newValue || "N/A"}"
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Nenhuma alteração detectada.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewDialog(false)}
                  className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Fechar visualização de alterações"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Upload de Arquivo */}
          {uploadDialog && (
            <Dialog
              open={!!uploadDialog}
              onOpenChange={() => setUploadDialog(null)}
            >
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl font-semibold">
                    {uploadDialog.type === "profile_picture" &&
                      "Enviar Foto de Perfil"}
                    {uploadDialog.type === "portfolio" && "Enviar Portfólio"}
                    {uploadDialog.type === "video" && "Enviar Vídeo"}
                    {uploadDialog.type === "related_files" &&
                      "Enviar Arquivos Relacionados"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {uploadDialog.previews.map((preview, index) => (
                    <div key={index} className="relative">
                      {uploadDialog.type === "profile_picture" && (
                        <div className="relative w-full h-64 sm:h-80">
                          <Image
                            src={preview}
                            alt={`Prévia do arquivo ${index + 1}`}
                            fill
                            className="object-contain rounded-md"
                            style={{
                              transform: `rotate(${uploadDialog.rotation}deg)`,
                            }}
                            loading="lazy"
                          />
                        </div>
                      )}
                      {uploadDialog.type === "portfolio" && (
                        <iframe
                          src={preview}
                          className="w-full h-64 sm:h-80 border-none rounded-md"
                          title={`Prévia do portfólio ${index + 1}`}
                        />
                      )}
                      {uploadDialog.type === "video" && (
                        <video
                          src={preview}
                          controls
                          className="w-full h-64 sm:h-80 rounded-md"
                          title={`Prévia do vídeo ${index + 1}`}
                        />
                      )}
                      {uploadDialog.type === "related_files" && (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-sm sm:text-base">
                            Arquivo: {uploadDialog.files[index].name}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Tamanho:{" "}
                            {(
                              uploadDialog.files[index].size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      )}
                      {uploadDialog.type === "profile_picture" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRotateImage}
                          className="absolute top-2 right-2 bg-background/80 border-muted-foreground/20 hover:bg-muted/20 text-primary transition-all duration-300 px-4 py-2"
                          aria-label="Rotacionar imagem"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      )}
                      {uploadDialog.type === "related_files" &&
                        uploadDialog.files.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadDialog({
                                ...uploadDialog,
                                files: uploadDialog.files.filter(
                                  (_, i) => i !== index
                                ),
                                previews: uploadDialog.previews.filter(
                                  (_, i) => i !== index
                                ),
                              });
                            }}
                            className="absolute top-2 right-2 bg-background/80 border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all duration-300 px-4 py-2"
                            aria-label={`Remover arquivo ${uploadDialog.files[index].name}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                    </div>
                  ))}
                  {isSubmitting && (
                    <div className="space-y-2">
                      <Progress
                        value={uploadProgress}
                        className="w-full"
                        aria-label="Progresso do upload"
                      />
                      <p className="text-sm sm:text-base text-center text-muted-foreground">
                        Enviando... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialog(null)}
                    disabled={isSubmitting}
                    className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                    aria-label="Cancelar upload"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUploadFile}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                    aria-label="Confirmar upload"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Confirmar"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Modal de Visualização de Arquivo */}
          {viewDialog && (
            <Dialog
              open={!!viewDialog}
              onOpenChange={() => setViewDialog(null)}
            >
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl font-semibold">
                    {viewDialog.type === "profile_picture" && "Foto de Perfil"}
                    {viewDialog.type === "portfolio" && "Portfólio"}
                    {viewDialog.type === "video" && "Vídeo"}
                    {viewDialog.type === "related_files" &&
                      "Arquivos Relacionados"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {viewDialog.isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2
                        className="w-8 h-8 animate-spin text-primary"
                        aria-label="Carregando arquivo"
                      />
                    </div>
                  ) : viewDialog.error ? (
                    <p className="text-red-600 text-sm sm:text-base">
                      {viewDialog.error}
                    </p>
                  ) : viewDialog.data ? (
                    <>
                      {viewDialog.type === "profile_picture" && (
                        <div className="relative w-full h-64 sm:h-80">
                          <Image
                            src={viewDialog.data}
                            alt="Foto de perfil"
                            fill
                            className="object-contain rounded-md"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {viewDialog.type === "portfolio" && (
                        <iframe
                          src={viewDialog.data}
                          className="w-full h-64 sm:h-80 border-none rounded-md"
                          title="Portfólio"
                        />
                      )}
                      {viewDialog.type === "video" && (
                        <video
                          src={viewDialog.data}
                          controls
                          className="w-full h-64 sm:h-80 rounded-md"
                          title="Vídeo"
                        />
                      )}
                      {viewDialog.type === "related_files" && (
                        <p className="text-sm sm:text-base text-muted-foreground">
                          Visualização de arquivos relacionados não suportada
                          diretamente.
                        </p>
                      )}
                    </>
                  ) : null}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setViewDialog(null)}
                    className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                    aria-label="Fechar visualização"
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Modal de Confirmação de Cancelamento */}
          <AlertDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
          >
            <AlertDialogContent className="bg-background rounded-lg shadow-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg sm:text-xl font-semibold">
                  Descartar alterações?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">
                  Todas as alterações não salvas serão perdidas. Tem certeza que
                  deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Voltar"
                >
                  Voltar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (originalValues) {
                      form.reset(originalValues);
                    }
                    setShowCancelDialog(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Descartar alterações"
                >
                  Descartar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal de Alteração de Senha */}
          <Dialog
            open={showPasswordDialog}
            onOpenChange={setShowPasswordDialog}
          >
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-semibold">
                  Alterar Senha
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="newPassword"
                    className="flex items-center gap-2 text-muted-foreground text-sm sm:text-base"
                  >
                    Nova Senha <span className="text-red-500 font-bold">*</span>
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    placeholder="Digite a nova senha"
                    className="mt-1 bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                    aria-describedby="password-error"
                    aria-label="Nova senha do usuário"
                  />
                  {passwordError && (
                    <p
                      id="password-error"
                      className="text-red-600 text-xs sm:text-sm mt-1"
                    >
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordDialog(false);
                    setNewPassword("");
                    setPasswordError(null);
                  }}
                  className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Cancelar alteração de senha"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleChangePassword}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Confirmar alteração de senha"
                >
                  Alterar Senha
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de Confirmação de Deleção */}
          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent className="bg-background rounded-lg shadow-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg sm:text-xl font-semibold">
                  Deletar Usuário
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">
                  Esta ação não pode ser desfeita. O usuário será
                  permanentemente removido do sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Cancelar deleção"
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteUser}
                  className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95 px-4 py-2"
                  aria-label="Confirmar deleção"
                >
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </TooltipProvider>
  );
};
export default EditUserContent;
