"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useForm } from "react-hook-form";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Schema de validação para edição (sem campo de senha)
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
  profilePicture: z.instanceof(File).optional(),
  portfolio: z.instanceof(File).optional(),
  video: z.instanceof(File).optional(),
  relatedFiles: z.instanceof(File).optional(),
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

export default function EditUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

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

  // Definir a variável global para a URL da API usando variável de ambiente
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

  // Carregar dados do usuário
  useEffect(() => {
    if (isAuthLoading) return;

    if (!user || !["admin", "secretary"].includes(user.role)) {
      router.push("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const token = getToken();
        // Use BASE_URL for axios request
        const response = await axios.get(`${BASE_URL}/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data;

        // Fill form with user data
        form.reset({
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
        });

        // Set profile picture preview if exists
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
        router.push(`/users/${id}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [id, user, isAuthLoading, router, form, BASE_URL]);

  // Função para formatar a data para o input
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

  const role = form.watch("role");

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
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : error instanceof Error
        ? error.message
        : "Ocorreu um erro inesperado ao buscar o CEP";
      toast({
        title: "Erro ao buscar CEP",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleFileChange = (
    field: keyof EditUserFormData,
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview?: (value: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        form.setError(field, {
          type: "manual",
          message: `O arquivo é muito grande. O limite é ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB.`,
        });
        return;
      }

      form.setValue(field, file);
      if (setPreview) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
      }
    } else {
      form.setValue(field, undefined);
      if (setPreview) setPreview(null);
    }
  };

  const onSubmit = async (values: EditUserFormData) => {
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) {
        toast({
          title: "❌ Token não encontrado",
          description: "Faça login novamente.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      const formDataToSend = new FormData();

      // Dados básicos
      formDataToSend.append("name", values.name);
      formDataToSend.append("email", values.email);
      formDataToSend.append("role", values.role);
      formDataToSend.append("cpf_cnpj", values.cpfCnpj.replace(/\D/g, ""));

      // Campos opcionais
      if (values.bio) formDataToSend.append("bio", values.bio);
      if (values.areaOfExpertise)
        formDataToSend.append("area_of_expertise", values.areaOfExpertise);
      if (values.birthDate) {
        formDataToSend.append(
          "birth_date",
          values.birthDate.split("/").reverse().join("-")
        );
      }

      // Endereço
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

      // Dados bancários
      const bankDetails = {
        bank_name: values.bankDetails.bank_name,
        account_type: values.bankDetails.account_type,
        agency: values.bankDetails.agency,
        account_number: values.bankDetails.account_number,
        pix_key: values.bankDetails.pix_key || "",
      };
      formDataToSend.append("bank_details", JSON.stringify(bankDetails));

      // Arquivos
      if (values.profilePicture)
        formDataToSend.append("profile_picture", values.profilePicture);
      if (values.portfolio)
        formDataToSend.append("portfolio", values.portfolio);
      if (values.video) formDataToSend.append("video", values.video);
      if (values.relatedFiles)
        formDataToSend.append("related_files", values.relatedFiles);

      // Usar BASE_URL para a requisição axios
      await axios.put(`${BASE_URL}/api/users/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast({
        title: "✅ Usuário atualizado com sucesso!",
        description: "As alterações foram salvas.",
      });
      router.push(`/users/${id}`);
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : error instanceof Error
        ? error.message
        : "Ocorreu um erro inesperado";
      toast({
        title: "❌ Erro ao atualizar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || isLoading) return <Loading />;
  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Editar {role === "artist" ? "Artista" : "Grupo Cultural"}
            </h1>
            <Button
              variant="outline"
              onClick={() => router.push(`/users/${id}`)}
              className="flex items-center gap-2"
              aria-label="Voltar para os detalhes do usuário"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Dados Pessoais</h2>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Nome Completo *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome completo"
                          {...field}
                          disabled={isSubmitting}
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
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-600" />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                          disabled={isSubmitting}
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
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Tipo de Cadastro *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger aria-label="Selecione o tipo de cadastro">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="artist">
                            Artista Individual
                          </SelectItem>
                          <SelectItem value="group">Grupo Cultural</SelectItem>
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
                      <FormLabel className="flex items-center gap-2">
                        {role === "artist" ? "CPF *" : "CNPJ *"}
                      </FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask={
                            role === "artist"
                              ? "000.000.000-00"
                              : "00.000.000/0000-00"
                          }
                          placeholder={
                            role === "artist"
                              ? "000.000.000-00"
                              : "00.000.000/0000-00"
                          }
                          {...field}
                          onAccept={(value) => field.onChange(value)}
                          disabled={isSubmitting}
                          aria-label={
                            role === "artist"
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
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        Data de Nascimento
                      </FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="00/00/0000"
                          placeholder="DD/MM/YYYY"
                          {...field}
                          onAccept={(value) => field.onChange(value)}
                          disabled={isSubmitting}
                          className="pl-10"
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
                      <FormLabel>Biografia</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Conte sobre o artista/grupo..."
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
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
                      <FormLabel>Área de Atuação</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Música, Teatro, Dança"
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
                          aria-label="Área de atuação"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Endereço */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-semibold">Endereço</h2>

                <FormField
                  control={form.control}
                  name="address.cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                        CEP *
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
                          className="pl-10"
                          aria-label="CEP do endereço"
                        />
                      </FormControl>
                      <div className="text-sm mt-1">
                        {cepStatus === "loading" && (
                          <p className="text-gray-500">Buscando endereço...</p>
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
                        <FormLabel>Logradouro *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
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
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
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
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
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
                        <FormLabel>Bairro *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
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
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
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
                      <FormLabel>Estado (UF) *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger aria-label="Selecione o estado">
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

              {/* Dados Bancários */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-semibold">Dados Bancários</h2>

                <FormField
                  control={form.control}
                  name="bankDetails.bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                        Nome do Banco *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isSubmitting}
                          className="pl-10"
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
                        <FormLabel>Tipo de Conta *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger aria-label="Selecione o tipo de conta">
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
                        <FormLabel>Agência *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
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
                        <FormLabel>Número da Conta *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
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
                        <FormLabel>Chave PIX</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            disabled={isSubmitting}
                            aria-label="Chave PIX"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Arquivos */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-semibold">Mídias e Arquivos</h2>

                <FormField
                  control={form.control}
                  name="profilePicture"
                  render={({}) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-indigo-600" />
                        Foto de Perfil
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/gif"
                          onChange={(e) =>
                            handleFileChange(
                              "profilePicture",
                              e,
                              setProfilePreview
                            )
                          }
                          disabled={isSubmitting}
                          aria-label="Selecionar foto de perfil"
                        />
                      </FormControl>
                      {profilePreview && (
                        <div className="mt-2 h-32 w-32 relative">
                          <Image
                            src={profilePreview}
                            alt="Prévia da foto de perfil"
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="portfolio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Portfólio (PDF)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => handleFileChange("portfolio", e)}
                          disabled={isSubmitting}
                          aria-label="Selecionar portfólio em PDF"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="text-sm text-gray-500 mt-1">
                          Arquivo selecionado: {field.value.name}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="video"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-indigo-600" />
                        Vídeo
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={(e) => handleFileChange("video", e)}
                          disabled={isSubmitting}
                          aria-label="Selecionar vídeo"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="text-sm text-gray-500 mt-1">
                          Arquivo selecionado: {field.value.name}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relatedFiles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Arquivos Relacionados
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          onChange={(e) => handleFileChange("relatedFiles", e)}
                          disabled={isSubmitting}
                          aria-label="Selecionar arquivos relacionados"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="text-sm text-gray-500 mt-1">
                          Arquivo selecionado: {field.value.name}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  aria-label="Salvar alterações do usuário"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/users/${id}`)}
                  disabled={isSubmitting}
                  aria-label="Cancelar edição"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPasswordDialog(true)}
                  disabled={isSubmitting}
                  aria-label="Alterar senha do usuário"
                >
                  Alterar Senha
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSubmitting}
                  aria-label="Deletar usuário"
                >
                  Deletar Usuário
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Diálogo de Confirmação para Deletar */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este usuário? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  // Usar BASE_URL para a requisição axios
                  await axios.delete(`${BASE_URL}/api/users/${id}`, {
                    headers: { Authorization: `Bearer ${getToken()}` },
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
              }}
              aria-label="Confirmar exclusão do usuário"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para Alterar Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (e.target.value.length < 6) {
                  setPasswordError("A senha deve ter pelo menos 6 caracteres");
                } else {
                  setPasswordError(null);
                }
              }}
              aria-label="Nova senha do usuário"
            />
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (newPassword.length < 6) {
                  setPasswordError("A senha deve ter pelo menos 6 caracteres");
                  return;
                }

                try {
                  // Usar BASE_URL para a requisição axios
                  await axios.put(
                    `${BASE_URL}/api/users/${id}/password`,
                    { new_password: newPassword },
                    { headers: { Authorization: `Bearer ${getToken()}` } }
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
              }}
              disabled={!!passwordError || newPassword.length === 0}
              aria-label="Salvar nova senha"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
