"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import axios from "axios";
import Image from "next/image";
import { useState } from "react";
import { Calendar, CreditCard, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  registerSchema,
  RegisterFormData,
  validateCep,
} from "@/lib/schemas/register-schema";

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

export function RegisterForm() {
  const router = useRouter();
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
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
      profilePicture: undefined,
      portfolio: undefined,
      video: undefined,
      relatedFiles: undefined,
    },
  });

  const role = form.watch("role");

  const fetchAddressByCep = async (cep: string) => {
    setIsLoadingCep(true);
    try {
      const data = await validateCep(cep);
      if (!data) {
        toast({ title: "CEP não encontrado", variant: "destructive" });
        return;
      }

      form.setValue("address.cep", cep);
      form.setValue("address.logradouro", data.logradouro || "");
      form.setValue("address.bairro", data.bairro || "");
      form.setValue("address.cidade", data.localidade || "");
      form.setValue("address.estado", data.uf || "SP");
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description:
          error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleFileChange = (
    field: keyof RegisterFormData,
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

  async function onSubmit(values: RegisterFormData) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      formData.append("name", values.name);
      formData.append("email", values.email);
      formData.append("password", values.password);
      formData.append("role", values.role);
      formData.append("cpf_cnpj", values.cpfCnpj.replace(/\D/g, ""));

      if (values.birthDate) {
        formData.append(
          "birth_date",
          values.birthDate.split("/").reverse().join("-")
        );
      }
      if (values.bio) formData.append("bio", values.bio);
      if (values.areaOfExpertise)
        formData.append("area_of_expertise", values.areaOfExpertise);

      const address = {
        cep: values.address.cep.replace(/\D/g, ""),
        logradouro: values.address.logradouro,
        numero: values.address.numero,
        complemento: values.address.complemento || "",
        bairro: values.address.bairro,
        cidade: values.address.cidade,
        estado: values.address.estado,
      };
      formData.append("address", JSON.stringify(address));

      const bankDetails = {
        bank_name: values.bankDetails.bank_name,
        account_type: values.bankDetails.account_type,
        agency: values.bankDetails.agency,
        account_number: values.bankDetails.account_number,
        pix_key: values.bankDetails.pix_key || "",
        account_holder_name: values.name,
        account_holder_document: values.cpfCnpj.replace(/\D/g, ""),
        account_holder_type:
          values.role === "artist" ? "individual" : "company",
      };
      formData.append("bank_details", JSON.stringify(bankDetails));

      if (values.profilePicture) {
        formData.append("profile_picture", values.profilePicture);
      }
      if (values.portfolio) {
        formData.append("portfolio", values.portfolio);
      }
      if (values.video) {
        formData.append("video", values.video);
      }
      if (values.relatedFiles) {
        formData.append("related_files", values.relatedFiles);
      }

      const response = await axios.post(
        "http://localhost:5000/api/users/register",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast({
          title: "✅ Cadastro realizado com sucesso!",
          description: "Redirecionando para a página de login...",
        });
        router.push("/login");
      } else {
        throw new Error(response.data.error || "Erro no cadastro");
      }
    } catch (error) {
      console.error("Erro no registro:", error);
      toast({
        title: "❌ Erro no registro",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">
        Cadastro de Artista/Grupo Cultural
      </h1>
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
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu nome completo"
                      {...field}
                      disabled={isSubmitting}
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha *</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirme sua senha"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cadastro *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="artist">Artista Individual</SelectItem>
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
                  <FormLabel>
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
                  <FormLabel>Data de Nascimento</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <MaskedInput
                        mask="00/00/0000"
                        placeholder="DD/MM/YYYY"
                        {...field}
                        onAccept={(value) => field.onChange(value)}
                        disabled={isSubmitting}
                        className="pl-10"
                      />
                    </FormControl>
                    <div>
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                    </div>
                  </div>
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
                      placeholder="Conte sobre você..."
                      {...field}
                      value={field.value || ""}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Opcional - Sua biografia será exibida em seu perfil público.
                  </FormDescription>
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
                  <FormLabel>CEP *</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                    <FormControl>
                      <MaskedInput
                        mask="00000-000"
                        placeholder="00000-000"
                        {...field}
                        onAccept={(value) => {
                          field.onChange(value);
                          fetchAddressByCep(value);
                        }}
                        disabled={isLoadingCep || isSubmitting}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  {isLoadingCep && (
                    <p className="text-sm text-gray-500">Buscando...</p>
                  )}
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
                      <Input {...field} disabled={isSubmitting} />
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
                      <Input {...field} disabled={isSubmitting} />
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
                      <Input {...field} disabled={isSubmitting} />
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
                      <Input {...field} disabled={isSubmitting} />
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
                      <SelectTrigger>
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
                  <FormLabel>Nome do Banco *</FormLabel>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isSubmitting}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="corrente">Conta Corrente</SelectItem>
                        <SelectItem value="poupanca">Conta Poupança</SelectItem>
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
                      <Input {...field} disabled={isSubmitting} />
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
                      <Input {...field} disabled={isSubmitting} />
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Arquivos */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Arquivos</h2>

            <FormField
              control={form.control}
              name="profilePicture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto de Perfil</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/gif"
                      onChange={(e) =>
                        handleFileChange("profilePicture", e, setProfilePreview)
                      }
                      disabled={isSubmitting}
                      aria-label="Selecionar foto de perfil (formatos aceitos: JPEG, PNG, JPG, GIF)"
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
                  {field.value && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivo selecionado: {field.value.name}
                    </p>
                  )}
                  <FormDescription>
                    Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="portfolio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfólio (PDF)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleFileChange("portfolio", e)}
                      disabled={isSubmitting}
                      aria-label="Selecionar portfólio (formato aceito: PDF)"
                    />
                  </FormControl>
                  {field.value && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivo selecionado: {field.value.name}
                    </p>
                  )}
                  <FormDescription>
                    Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="video"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vídeo</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg"
                      onChange={(e) => handleFileChange("video", e)}
                      disabled={isSubmitting}
                      aria-label="Selecionar vídeo (formatos aceitos: MP4, WebM, OGG)"
                    />
                  </FormControl>
                  {field.value && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivo selecionado: {field.value.name}
                    </p>
                  )}
                  <FormDescription>
                    Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relatedFiles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arquivos Relacionados</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange("relatedFiles", e)}
                      disabled={isSubmitting}
                      aria-label="Selecionar arquivos relacionados (qualquer formato)"
                    />
                  </FormControl>
                  {field.value && (
                    <p className="text-sm text-gray-500 mt-1">
                      Arquivo selecionado: {field.value.name}
                    </p>
                  )}
                  <FormDescription>
                    Tamanho máximo: {MAX_FILE_SIZE / (1024 * 1024)}MB
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Cadastrando..." : "Registrar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
