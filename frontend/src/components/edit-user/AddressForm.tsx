"use client";

import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";

export interface AddressFormProps {
  isSubmitting: boolean;
  isLoadingCep: boolean;
  cepStatus: "idle" | "loading" | "success" | "error";
  debouncedFetchAddress: (cep: string | undefined) => void;
  handleCancel: () => void;
  onSubmitAddress: (values: EditUserFormData) => void;
  setShowPreviewDialog: (value: boolean) => void;
  setCepStatus: (status: "idle" | "loading" | "success" | "error") => void;
  addressData: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
}

const AddressForm = ({
  isSubmitting,
  isLoadingCep,
  cepStatus,
  debouncedFetchAddress,
  handleCancel,
  onSubmitAddress,
  setShowPreviewDialog,
  setCepStatus,
  addressData,
}: AddressFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    watch,
    setValue,
  } = useFormContext<EditUserFormData>();

  const cepValue = watch("address.cep");

  useEffect(() => {
    if (cepValue && cepValue.replace(/\D/g, "").length === 8) {
      debouncedFetchAddress(cepValue);
    } else if (cepValue && cepValue.replace(/\D/g, "").length < 8) {
      setCepStatus("idle");
    }
  }, [cepValue, debouncedFetchAddress, setCepStatus]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-background">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <Label htmlFor="address.cep" className="text-sm font-medium">
            CEP
          </Label>
          <Input
            id="address.cep"
            {...register("address.cep")}
            defaultValue={addressData.cep}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.address?.cep ? "true" : "false"}
          />
          {errors.address?.cep && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.cep.message}
            </p>
          )}
          {isLoadingCep && (
            <p className="text-xs text-muted-foreground">
              Buscando endereço...
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address.logradouro" className="text-sm font-medium">
            Logradouro
          </Label>
          <Input
            id="address.logradouro"
            {...register("address.logradouro")}
            defaultValue={addressData.logradouro}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.address?.logradouro ? "true" : "false"}
          />
          {errors.address?.logradouro && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.logradouro.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address.numero" className="text-sm font-medium">
            Número
          </Label>
          <Input
            id="address.numero"
            {...register("address.numero")}
            defaultValue={addressData.numero}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.address?.numero ? "true" : "false"}
          />
          {errors.address?.numero && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.numero.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address.complemento" className="text-sm font-medium">
            Complemento
          </Label>
          <Input
            id="address.complemento"
            {...register("address.complemento")}
            defaultValue={addressData.complemento}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.address?.complemento ? "true" : "false"}
          />
          {errors.address?.complemento && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.complemento.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address.bairro" className="text-sm font-medium">
            Bairro
          </Label>
          <Input
            id="address.bairro"
            {...register("address.bairro")}
            defaultValue={addressData.bairro}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.address?.bairro ? "true" : "false"}
          />
          {errors.address?.bairro && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.bairro.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address.cidade" className="text-sm font-medium">
            Cidade
          </Label>
          <Input
            id="address.cidade"
            {...register("address.cidade")}
            defaultValue={addressData.cidade}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.address?.cidade ? "true" : "false"}
          />
          {errors.address?.cidade && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.cidade.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address.estado" className="text-sm font-medium">
            Estado
          </Label>
          <Select
            onValueChange={(value) => setValue("address.estado", value)}
            defaultValue={addressData.estado}
          >
            <SelectTrigger
              id="address.estado"
              className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
              aria-invalid={errors.address?.estado ? "true" : "false"}
            >
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AC">AC</SelectItem>
              <SelectItem value="AL">AL</SelectItem>
              <SelectItem value="AP">AP</SelectItem>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="BA">BA</SelectItem>
              <SelectItem value="CE">CE</SelectItem>
              <SelectItem value="DF">DF</SelectItem>
              <SelectItem value="ES">ES</SelectItem>
              <SelectItem value="GO">GO</SelectItem>
              <SelectItem value="MA">MA</SelectItem>
              <SelectItem value="MT">MT</SelectItem>
              <SelectItem value="MS">MS</SelectItem>
              <SelectItem value="MG">MG</SelectItem>
              <SelectItem value="PA">PA</SelectItem>
              <SelectItem value="PB">PB</SelectItem>
              <SelectItem value="PR">PR</SelectItem>
              <SelectItem value="PE">PE</SelectItem>
              <SelectItem value="PI">PI</SelectItem>
              <SelectItem value="RJ">RJ</SelectItem>
              <SelectItem value="RN">RN</SelectItem>
              <SelectItem value="RS">RS</SelectItem>
              <SelectItem value="RO">RO</SelectItem>
              <SelectItem value="RR">RR</SelectItem>
              <SelectItem value="SC">SC</SelectItem>
              <SelectItem value="SP">SP</SelectItem>
              <SelectItem value="SE">SE</SelectItem>
              <SelectItem value="TO">TO</SelectItem>
            </SelectContent>
          </Select>
          {errors.address?.estado && (
            <p className="text-xs text-red-500" role="alert">
              {errors.address.estado.message}
            </p>
          )}
        </div>
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
          onClick={handleSubmit(onSubmitAddress)}
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

export default AddressForm;
