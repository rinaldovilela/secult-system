"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import {
  Calendar,
  CreditCard,
  MapPin,
  User,
  Mail,
  FileText,
  Video,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { getToken } from "@/lib/auth";
import { z } from "zod";

const editUserSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["artist", "group"], {
    message: "Selecione o tipo (Artista ou Grupo Cultural)",
  }),
  documentType: z.enum(["cpf", "cnpj"], {
    message: "Selecione o tipo de documento (CPF ou CNPJ)",
  }),
  cpf_cnpj: z.string().refine(
    (value) => {
      const cleanValue = value.replace(/\D/g, "");
      const isCpf = cleanValue.length === 11;
      const isCnpj = cleanValue.length === 14;
      return isCpf || isCnpj;
    },
    {
      message: "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos",
    }
  ),
  bio: z.string().optional(),
  area_of_expertise: z.string().optional(),
  birth_date: z.string().optional(),
  address: z.object({
    cep: z
      .string()
      .refine((value) => {
        const cleanValue = value.replace(/\D/g, "");
        return cleanValue.length === 8;
      }, "CEP deve ter 8 dígitos")
      .refine(
        (value) => {
          return /^\d{5}-?\d{3}$/.test(value);
        },
        {
          message: "CEP deve ter o formato 00000-000 ou 00000000",
        }
      ),
    logradouro: z.string().min(1, "Logradouro é obrigatório"),
    numero: z.string().min(1, "Número é obrigatório"),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Bairro é obrigatório"),
    cidade: z.string().min(1, "Cidade é obrigatória"),
    estado: z.string().length(2, "Estado deve ter 2 caracteres"),
  }),
  bank_details: z.object({
    bank_name: z.string().min(1, "Nome do banco é obrigatório"),
    account_type: z.enum(["corrente", "poupanca"]),
    agency: z.string().min(1, "Agência é obrigatória"),
    account_number: z.string().min(1, "Número da conta é obrigatório"),
    pix_key: z.string().optional(),
  }),
  profile_picture: z.instanceof(File).optional(),
  portfolio: z.instanceof(File).optional(),
  video: z.instanceof(File).optional(),
  related_files: z.instanceof(File).optional(),
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
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const CACHE_KEY = "userDetailsCache";

export default function EditUser() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || undefined;
  const [formData, setFormData] = useState<EditUserFormData | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepStatus, setCepStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [dataFetched, setDataFetched] = useState(false);

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "artist",
      documentType: "cpf",
      cpf_cnpj: "",
      bio: "",
      area_of_expertise: "",
      birth_date: "",
      address: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "SP",
      },
      bank_details: {
        bank_name: "",
        account_type: "corrente",
        agency: "",
        account_number: "",
        pix_key: "",
      },
      profile_picture: undefined,
      portfolio: undefined,
      video: undefined,
      related_files: undefined,
    },
  });

  const documentType = form.watch("documentType");

  const fetchUserData = useCallback(async () => {
    const cachedData = localStorage.getItem(`${CACHE_KEY}_${id}`);
    if (cachedData) {
      const parsedData = JSON.parse(cachedData);
      form.reset(parsedData.formData);
      setProfilePreview(parsedData.profilePreview || null);
      setDataFetched(true);
      return;
    }

    try {
      const token = getToken();
      if (!token) throw new Error("Token não encontrado");

      const response = await axios.get(`${BASE_URL}/api/users/details/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate, br", // Solicitar compressão
        },
        maxRedirects: 0,
        withCredentials: false,
      });
      const userData = response.data;

      const mappedData: EditUserFormData = {
        name: userData.name || "",
        email: userData.email || "",
        role:
          userData.role && ["artist", "group"].includes(userData.role)
            ? userData.role
            : "artist",
        documentType:
          userData.cpf_cnpj && userData.cpf_cnpj.length === 11 ? "cpf" : "cnpj",
        cpf_cnpj: userData.cpf_cnpj || "",
        bio: userData.bio || "",
        area_of_expertise: userData.area_of_expertise || "",
        birth_date: userData.birth_date
          ? new Date(userData.birth_date).toLocaleDateString("pt-BR")
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
        bank_details: {
          bank_name: userData.bank_details?.bank_name || "",
          account_type:
            userData.bank_details?.account_type &&
            ["corrente", "poupanca"].includes(
              userData.bank_details.account_type
            )
              ? userData.bank_details.account_type
              : "corrente",
          agency: userData.bank_details?.agency || "",
          account_number: userData.bank_details?.account_number || "",
          pix_key: userData.bank_details?.pix_key || "",
        },
        profile_picture: undefined,
        portfolio: undefined,
        video: undefined,
        related_files: undefined,
      };

      const preview =
        userData.profile_picture && typeof userData.profile_picture === "string"
          ? userData.profile_picture.startsWith("data:image")
            ? userData.profile_picture
            : `data:image/jpeg;base64,${userData.profile_picture}`
          : null;

      form.reset(mappedData);
      setFormData(mappedData);
      setProfilePreview(preview);
      setDataFetched(true);

      // Cache por 5 minutos (300000 ms)
      localStorage.setItem(
        `${CACHE_KEY}_${id}`,
        JSON.stringify({
          formData: mappedData,
          profilePreview: preview,
          timestamp: Date.now(),
        })
      );
      setTimeout(() => localStorage.removeItem(`${CACHE_KEY}_${id}`), 300000);
    } catch (error) {
      console.error("Error fetching user data:", error);
      if (axios.isAxiosError(error) && error.response?.status === 431) {
        toast({
          title: "Erro de cabeçalho muito grande",
          description:
            "O servidor rejeitou a requisição devido a cabeçalhos excessivamente grandes. Tente novamente ou contacte o administrador.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao carregar usuário",
          description:
            "Não foi possível carregar os dados. Verifique a conexão ou tente novamente.",
          variant: "destructive",
        });
      }
      router.push("/search");
    }
  }, [id, form, router]);

  useEffect(() => {
    if (!id) {
      router.push("/search");
      return;
    }

    if (!isAuthLoading && !dataFetched) {
      fetchUserData();
    }
  }, [isAuthLoading, dataFetched, id, router, fetchUserData]);

  const fetchAddressByCep = useMemo(
    () => async (cep: string) => {
      const cleanCep = cep.replace(/\D/g, "");
      if (cleanCep.length !== 8) return;

      setIsLoadingCep(true);
      setCepStatus("loading");
      try {
        const response = await axios.get(
          `https://viacep.com.br/ws/${cleanCep}/json/`,
          {
            timeout: 5000,
          }
        );
        const data = response.data;
        if (data.erro) {
          setCepStatus("error");
          toast({
            title: "CEP não encontrado",
            description: "Preencha os campos manualmente.",
            variant: "destructive",
          });
          return;
        }

        form.setValue("address.cep", cep);
        form.setValue("address.logradouro", data.logradouro || "");
        form.setValue("address.bairro", data.bairro || "");
        form.setValue("address.cidade", data.localidade || "");
        form.setValue("address.estado", data.uf || "SP");
        setCepStatus("success");
        toast({ title: "Endereço preenchido com sucesso!" });
      } catch (error) {
        setCepStatus("error");
        toast({
          title: "Erro ao buscar CEP",
          description: "Tente novamente ou preencha manualmente.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCep(false);
      }
    },
    [form]
  );

  const handleFileChange = useCallback(
    (
      field: keyof EditUserFormData,
      e: React.ChangeEvent<HTMLInputElement>,
      setPreview?: (value: string | null) => void
    ) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          form.setError(field, {
            type: "manual",
            message: `Máximo ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
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
    },
    [form]
  );

  const onSubmit = async (values: EditUserFormData) => {
    setIsSubmitting(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Token não encontrado");

      const formDataToSend = new FormData();
      formDataToSend.append("name", values.name);
      formDataToSend.append("email", values.email);
      formDataToSend.append("role", values.role);
      formDataToSend.append("cpf_cnpj", values.cpf_cnpj.replace(/\D/g, ""));
      if (values.bio) formDataToSend.append("bio", values.bio);
      if (values.area_of_expertise)
        formDataToSend.append("area_of_expertise", values.area_of_expertise);
      if (values.birth_date)
        formDataToSend.append(
          "birth_date",
          values.birth_date.split("/").reverse().join("-")
        );

      formDataToSend.append(
        "address",
        JSON.stringify({
          cep: values.address.cep.replace(/\D/g, ""),
          logradouro: values.address.logradouro,
          numero: values.address.numero,
          complemento: values.address.complemento || "",
          bairro: values.address.bairro,
          cidade: values.address.cidade,
          estado: values.address.estado,
        })
      );

      formDataToSend.append(
        "bank_details",
        JSON.stringify({
          bank_name: values.bank_details.bank_name,
          account_type: values.bank_details.account_type,
          agency: values.bank_details.agency,
          account_number: values.bank_details.account_number,
          pix_key: values.bank_details.pix_key || "",
        })
      );

      if (values.profile_picture)
        formDataToSend.append("profile_picture", values.profile_picture);
      if (values.portfolio)
        formDataToSend.append("portfolio", values.portfolio);
      if (values.video) formDataToSend.append("video", values.video);
      if (values.related_files)
        formDataToSend.append("related_files", values.related_files);

      await axios.put(`${BASE_URL}/api/users/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
          Accept: "application/json",
        },
        maxBodyLength: Infinity,
        withCredentials: false,
      });

      toast({ title: "Usuário atualizado com sucesso!" });
      router.push("/search");
    } catch (error) {
      toast({
        title: "Erro ao atualizar usuário",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || "Tente novamente"
          : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full space-y-6">
          <div className="flex justify-center">
            <div className="animate-pulse h-12 w-12 rounded-full bg-muted-foreground/20"></div>
          </div>
          <div className="bg-muted shadow-lg rounded-lg p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div className="h-8 w-1/2 bg-muted-foreground/20 rounded"></div>
              <div className="h-10 w-24 bg-muted-foreground/20 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 w-1/4 bg-muted-foreground/20 rounded"></div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full bg-muted-foreground/20 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !["admin", "secretary"].includes(user.role)) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
        <div className="bg-muted shadow-lg rounded-lg p-6 sm:p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Editar Usuário
            </h1>
            <Button
              variant="outline"
              onClick={() => router.push("/search")}
              className="flex items-center gap-2 border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 shadow-sm transition-all duration-300 active:scale-95"
              aria-label="Voltar para a página de busca"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              aria-label="Formulário de edição de usuário"
            >
              <div className="bg-muted/50 p-6 rounded-lg space-y-4 animate-in fade-in duration-500">
                <h2 className="text-xl font-semibold text-foreground">
                  Dados Pessoais
                </h2>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-5 h-5 text-primary" />
                        Nome Completo *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome completo"
                          {...field}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="name-error"
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
                        <Mail className="w-5 h-5 text-primary" />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="email-error"
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
                        <User className="w-5 h-5 text-primary" />
                        Tipo de Cadastro *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-label="Selecione o tipo de cadastro"
                          >
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
                      <FormMessage id="role-error" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-5 h-5 text-primary" />
                          Tipo de Documento *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                              aria-label="Selecione o tipo de documento"
                            >
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cpf">CPF</SelectItem>
                            <SelectItem value="cnpj">CNPJ</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage id="documentType-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-muted-foreground">
                          {documentType === "cpf" ? "CPF *" : "CNPJ *"}
                        </FormLabel>
                        <FormControl>
                          <MaskedInput
                            mask={
                              documentType === "cpf"
                                ? "000.000.000-00"
                                : "00.000.000/0000-00"
                            }
                            placeholder={
                              documentType === "cpf"
                                ? "000.000.000-00"
                                : "00.000.000/0000-00"
                            }
                            {...field}
                            onAccept={(value) => field.onChange(value)}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="cpf_cnpj-error"
                          />
                        </FormControl>
                        <FormMessage id="cpf_cnpj-error" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="birth_date"
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
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="birth_date-error"
                        />
                      </FormControl>
                      <FormMessage id="birth_date-error" />
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
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="bio-error"
                        />
                      </FormControl>
                      <FormMessage id="bio-error" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="area_of_expertise"
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
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="area_of_expertise-error"
                        />
                      </FormControl>
                      <FormMessage id="area_of_expertise-error" />
                    </FormItem>
                  )}
                />
              </div>

              <div
                className="bg-muted/50 p-6 rounded-lg space-y-4 animate-in fade-in duration-500"
                style={{ animationDelay: "100ms" }}
              >
                <h2 className="text-xl font-semibold text-foreground">
                  Endereço
                </h2>
                <FormField
                  control={form.control}
                  name="address.cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-5 h-5 text-primary" />
                        CEP *
                      </FormLabel>
                      <FormControl>
                        <MaskedInput
                          mask="00000-000"
                          placeholder="00000-000"
                          {...field}
                          onAccept={(value) => {
                            field.onChange(value);
                            if (value.replace(/\D/g, "").length === 8)
                              fetchAddressByCep(value);
                          }}
                          disabled={isLoadingCep || isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="cep-error"
                        />
                      </FormControl>
                      <div className="text-sm mt-1 flex items-center gap-2">
                        {cepStatus === "loading" && (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        )}
                        {cepStatus === "success" && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                        {cepStatus === "error" && (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        )}
                        {cepStatus !== "idle" && (
                          <p
                            className={`text-${
                              cepStatus === "success"
                                ? "primary"
                                : cepStatus === "error"
                                ? "destructive"
                                : "muted-foreground"
                            }`}
                          >
                            {cepStatus === "loading"
                              ? "Buscando..."
                              : cepStatus === "success"
                              ? "Endereço preenchido!"
                              : "Erro ao buscar CEP"}
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
                        <FormLabel className="text-muted-foreground">
                          Logradouro *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="logradouro-error"
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
                        <FormLabel className="text-muted-foreground">
                          Número *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="numero-error"
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
                      <FormLabel className="text-muted-foreground">
                        Complemento
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="complemento-error"
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
                        <FormLabel className="text-muted-foreground">
                          Bairro *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="bairro-error"
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
                        <FormLabel className="text-muted-foreground">
                          Cidade *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="cidade-error"
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
                      <FormLabel className="text-muted-foreground">
                        Estado (UF) *
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
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

              <div
                className="bg-muted/50 p-6 rounded-lg space-y-4 animate-in fade-in duration-500"
                style={{ animationDelay: "200ms" }}
              >
                <h2 className="text-xl font-semibold text-foreground">
                  Dados Bancários
                </h2>
                <FormField
                  control={form.control}
                  name="bank_details.bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Nome do Banco *
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="bank_name-error"
                        />
                      </FormControl>
                      <FormMessage id="bank_name-error" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bank_details.account_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Tipo de Conta *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
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
                    name="bank_details.agency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Agência *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="agency-error"
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
                    name="bank_details.account_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground">
                          Número da Conta *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isSubmitting}
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="account_number-error"
                          />
                        </FormControl>
                        <FormMessage id="account_number-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_details.pix_key"
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
                            className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                            aria-describedby="pix_key-error"
                          />
                        </FormControl>
                        <FormMessage id="pix_key-error" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div
                className="bg-muted/50 p-6 rounded-lg space-y-4 animate-in fade-in duration-500"
                style={{ animationDelay: "300ms" }}
              >
                <h2 className="text-xl font-semibold text-foreground">
                  Mídias e Arquivos
                </h2>
                <FormField
                  control={form.control}
                  name="profile_picture"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Foto de Perfil
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/gif"
                          onChange={(e) =>
                            handleFileChange(
                              "profile_picture",
                              e,
                              setProfilePreview
                            )
                          }
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="profile_picture-error"
                        />
                      </FormControl>
                      {profilePreview ? (
                        <div className="mt-2 h-40 w-40 relative rounded-full overflow-hidden shadow-sm">
                          <Image
                            src={profilePreview}
                            alt="Prévia da foto de perfil"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : dataFetched ? null : (
                        <div className="mt-2 h-40 w-40 relative rounded-full overflow-hidden shadow-sm">
                          <Skeleton className="h-full w-full bg-muted-foreground/20 rounded-full" />
                        </div>
                      )}
                      <FormDescription>
                        Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                      </FormDescription>
                      <FormMessage id="profile_picture-error" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="portfolio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-5 h-5 text-primary" />
                        Portfólio (PDF)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => handleFileChange("portfolio", e)}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="portfolio-error"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {field.value.name}
                        </p>
                      )}
                      <FormDescription>
                        Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                      </FormDescription>
                      <FormMessage id="portfolio-error" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="video"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <Video className="w-5 h-5 text-primary" />
                        Vídeo
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="video/mp4,video/webm,video/ogg"
                          onChange={(e) => handleFileChange("video", e)}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="video-error"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {field.value.name}
                        </p>
                      )}
                      <FormDescription>
                        Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                      </FormDescription>
                      <FormMessage id="video-error" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="related_files"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-5 h-5 text-primary" />
                        Arquivos Relacionados
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          onChange={(e) => handleFileChange("related_files", e)}
                          disabled={isSubmitting}
                          className="rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
                          aria-describedby="related_files-error"
                        />
                      </FormControl>
                      {field.value && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {field.value.name}
                        </p>
                      )}
                      <FormDescription>
                        Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                      </FormDescription>
                      <FormMessage id="related_files-error" />
                    </FormItem>
                  )}
                />
              </div>

              <div
                className="flex gap-4 pt-4 animate-in fade-in duration-500"
                style={{ animationDelay: "400ms" }}
              >
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md transition-all duration-300 active:scale-95"
                  aria-label="Salvar alterações do usuário"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/search")}
                  disabled={isSubmitting}
                  className="w-full border-muted-foreground/20 text-muted-foreground hover:bg-muted/20 shadow-sm transition-all duration-300 active:scale-95"
                  aria-label="Cancelar edição"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
