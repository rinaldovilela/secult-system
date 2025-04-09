// lib/schemas/register-schema.ts
import { z } from "zod";

// Função de validação de CPF/CNPJ
const validateCpfCnpj = (value: string): boolean => {
  const cleanValue = value.replace(/\D/g, "");

  // Validação de CPF
  if (cleanValue.length === 11) {
    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanValue[i - 1]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanValue[9])) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanValue[i - 1]) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanValue[10])) return false;

    return true;
  }

  // Validação de CNPJ
  else if (cleanValue.length === 14) {
    let size = cleanValue.length - 2;
    let numbers = cleanValue.substring(0, size);
    const digits = cleanValue.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cleanValue.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
  }

  return false;
};

// Lista de UFs do Brasil
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

// Schema de endereço
const addressSchema = z.object({
  cep: z
    .string()
    .length(8, "CEP deve ter 8 dígitos")
    .regex(/^\d{8}$/, "CEP inválido"),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z
    .string()
    .length(2, "UF deve ter 2 caracteres")
    .refine((val) => BRAZILIAN_STATES.includes(val), {
      message: "UF inválida",
    }),
});

// Schema de dados bancários
const bankDetailsSchema = z.object({
  bank_name: z.string().min(1, "Nome do banco é obrigatório"),
  account_type: z.enum(["corrente", "poupanca"], {
    errorMap: () => ({ message: "Selecione o tipo de conta" }),
  }),
  agency: z
    .string()
    .min(1, "Agência é obrigatória")
    .refine((val) => /^\d+$/.test(val), {
      message: "Agência deve conter apenas números",
    }),
  account_number: z
    .string()
    .min(1, "Número da conta é obrigatório")
    .refine((val) => /^[\d-]+$/.test(val), {
      message: "Conta inválida",
    }),
  pix_key: z.string().optional(),
});

// Schema principal
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(3, "Nome deve ter no mínimo 3 caracteres")
      .max(100, "Nome muito longo"),
    email: z.string().email("Email inválido").max(100, "Email muito longo"),
    password: z
      .string()
      .min(6, "Senha deve ter no mínimo 6 caracteres")
      .max(50, "Senha muito longa")
      .refine((val) => /[A-Z]/.test(val), {
        message: "Senha deve conter pelo menos 1 letra maiúscula",
      })
      .refine((val) => /[0-9]/.test(val), {
        message: "Senha deve conter pelo menos 1 número",
      }),
    confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
    role: z.enum(["artist", "group"], {
      errorMap: () => ({ message: "Selecione um tipo válido" }),
    }),
    cpfCnpj: z
      .string()
      .refine(
        (val) => {
          const cleanValue = val.replace(/\D/g, "");
          return cleanValue.length === 11 || cleanValue.length === 14;
        },
        { message: "CPF/CNPJ inválido" }
      )
      .refine(validateCpfCnpj, {
        message: "CPF/CNPJ inválido",
      }),
    bio: z.string().max(500, "Biografia muito longa").optional(),
    areaOfExpertise: z
      .string()
      .max(100, "Área de atuação muito longa")
      .optional(),
    birthDate: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Data inválida",
      })
      .optional(),
    address: addressSchema,
    bankDetails: bankDetailsSchema,
    profilePicture: z
      .instanceof(File)
      .refine((file) => !file || file.size <= 5 * 1024 * 1024, {
        message: "A imagem deve ter no máximo 5MB",
      })
      .refine(
        (file) => !file || /^image\/(jpeg|png|jpg|gif)$/.test(file.type),
        {
          message: "Formato de imagem inválido",
        }
      )
      .optional(),
    portfolio: z
      .instanceof(File)
      .refine((file) => !file || file.size <= 10 * 1024 * 1024, {
        message: "O arquivo deve ter no máximo 10MB",
      })
      .refine((file) => !file || file.type === "application/pdf", {
        message: "Somente PDF é permitido",
      })
      .optional(),
    video: z
      .instanceof(File)
      .refine((file) => !file || file.size <= 50 * 1024 * 1024, {
        message: "O vídeo deve ter no máximo 50MB",
      })
      .refine((file) => !file || /^video\/(mp4|webm|ogg)$/.test(file.type), {
        message: "Formato de vídeo inválido",
      })
      .optional(),
    relatedFiles: z
      .instanceof(File)
      .refine((file) => !file || file.size <= 20 * 1024 * 1024, {
        message: "O arquivo deve ter no máximo 20MB",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validação de confirmação de senha
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas não coincidem",
      });
    }

    // Validação condicional: address e bankDetails são obrigatórios apenas para artist e group
    if (["artist", "group"].includes(data.role)) {
      if (!data.address.cep) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address", "cep"],
          message: "CEP é obrigatório para artistas e grupos culturais",
        });
      }
      if (!data.bankDetails.bank_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bankDetails", "bank_name"],
          message:
            "Nome do banco é obrigatório para artistas e grupos culturais",
        });
      }
    }
  });

// Tipo inferido do schema
export type RegisterFormData = z.infer<typeof registerSchema>;

// Função para validar CEP usando a API ViaCEP
export const validateCep = async (cep: string) => {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    return data.erro ? null : data;
  } catch (error) {
    console.error("Erro ao validar CEP:", error);
    return null;
  }
};
