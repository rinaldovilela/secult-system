"use client";

import { useFormContext } from "react-hook-form";
import { EditUserFormData } from "./EditUserContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface PersonalFormProps {
  isSubmitting: boolean;
  handleCancel: () => void;
  onSubmitPersonal: (values: EditUserFormData) => void;
  setShowPreviewDialog: (value: boolean) => void;
  personalData: {
    name: string;
    email: string;
    role: string;
    cpfCnpj: string;
    bio: string;
    areaOfExpertise: string;
    birthDate: string;
  };
}

const PersonalForm = ({
  isSubmitting,
  handleCancel,
  onSubmitPersonal,
  setShowPreviewDialog,
  personalData,
}: PersonalFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
  } = useFormContext<EditUserFormData>();

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Nome
          </Label>
          <Input
            id="name"
            {...register("name")}
            defaultValue={personalData.name}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.name ? "true" : "false"}
          />
          {errors.name && (
            <p className="text-xs text-red-500" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            defaultValue={personalData.email}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.email ? "true" : "false"}
          />
          {errors.email && (
            <p className="text-xs text-red-500" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-medium">
            Tipo
          </Label>
          <Select
            onValueChange={(value: "artist" | "group") =>
              setValue("role", value)
            }
            defaultValue={personalData.role}
          >
            <SelectTrigger
              id="role"
              className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
              aria-invalid={errors.role ? "true" : "false"}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="artist">Artista</SelectItem>
              <SelectItem value="group">Grupo Cultural</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-xs text-red-500" role="alert">
              {errors.role.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpfCnpj" className="text-sm font-medium">
            CPF/CNPJ
          </Label>
          <Input
            id="cpfCnpj"
            {...register("cpfCnpj")}
            defaultValue={personalData.cpfCnpj}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.cpfCnpj ? "true" : "false"}
          />
          {errors.cpfCnpj && (
            <p className="text-xs text-red-500" role="alert">
              {errors.cpfCnpj.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate" className="text-sm font-medium">
            Data de Nascimento
          </Label>
          <Input
            id="birthDate"
            {...register("birthDate")}
            defaultValue={personalData.birthDate}
            placeholder="DD/MM/AAAA"
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.birthDate ? "true" : "false"}
          />
          {errors.birthDate && (
            <p className="text-xs text-red-500" role="alert">
              {errors.birthDate.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="areaOfExpertise" className="text-sm font-medium">
            Área de Atuação
          </Label>
          <Input
            id="areaOfExpertise"
            {...register("areaOfExpertise")}
            defaultValue={personalData.areaOfExpertise}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.areaOfExpertise ? "true" : "false"}
          />
          {errors.areaOfExpertise && (
            <p className="text-xs text-red-500" role="alert">
              {errors.areaOfExpertise.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium">
          Bio
        </Label>
        <Textarea
          id="bio"
          {...register("bio")}
          defaultValue={personalData.bio}
          className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm min-h-[100px]"
          aria-invalid={errors.bio ? "true" : "false"}
        />
        {errors.bio && (
          <p className="text-xs text-red-500" role="alert">
            {errors.bio.message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
          aria-label="Cancelar alterações"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => setShowPreviewDialog(true)}
          disabled={isSubmitting || !isDirty}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white transition-all duration-300 active:scale-95 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
          aria-label="Visualizar alterações"
        >
          Visualizar Alterações
        </Button>
        <Button
          type="button"
          onClick={handleSubmit(onSubmitPersonal)}
          disabled={isSubmitting || !isDirty}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
          aria-label="Salvar alterações"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Salvar
        </Button>
      </div>
    </div>
  );
};

export default PersonalForm;
