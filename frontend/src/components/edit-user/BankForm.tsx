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
import { Loader2 } from "lucide-react";

interface BankFormProps {
  isSubmitting: boolean;
  handleCancel: () => void;
  onSubmitBank: (values: EditUserFormData) => void;
  setShowPreviewDialog: (value: boolean) => void;
  bankData: {
    bank_name: string;
    account_type: string;
    agency: string;
    account_number: string;
    pix_key: string;
  };
}

const BankForm = ({
  isSubmitting,
  handleCancel,
  onSubmitBank,
  setShowPreviewDialog,
  bankData,
}: BankFormProps) => {
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
          <Label
            htmlFor="bankDetails.bank_name"
            className="text-sm font-medium"
          >
            Nome do Banco
          </Label>
          <Input
            id="bankDetails.bank_name"
            {...register("bankDetails.bank_name")}
            defaultValue={bankData.bank_name}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.bankDetails?.bank_name ? "true" : "false"}
          />
          {errors.bankDetails?.bank_name && (
            <p className="text-xs text-red-500" role="alert">
              {errors.bankDetails.bank_name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="bankDetails.account_type"
            className="text-sm font-medium"
          >
            Tipo de Conta
          </Label>
          <Select
            onValueChange={(value: "corrente" | "poupanca") =>
              setValue("bankDetails.account_type", value)
            }
            defaultValue={bankData.account_type}
          >
            <SelectTrigger
              id="bankDetails.account_type"
              className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
              aria-invalid={errors.bankDetails?.account_type ? "true" : "false"}
            >
              <SelectValue placeholder="Selecione o tipo de conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corrente">Conta Corrente</SelectItem>
              <SelectItem value="poupanca">Conta Poupança</SelectItem>
            </SelectContent>
          </Select>
          {errors.bankDetails?.account_type && (
            <p className="text-xs text-red-500" role="alert">
              {errors.bankDetails.account_type.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankDetails.agency" className="text-sm font-medium">
            Agência
          </Label>
          <Input
            id="bankDetails.agency"
            {...register("bankDetails.agency")}
            defaultValue={bankData.agency}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.bankDetails?.agency ? "true" : "false"}
          />
          {errors.bankDetails?.agency && (
            <p className="text-xs text-red-500" role="alert">
              {errors.bankDetails.agency.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="bankDetails.account_number"
            className="text-sm font-medium"
          >
            Número da Conta
          </Label>
          <Input
            id="bankDetails.account_number"
            {...register("bankDetails.account_number")}
            defaultValue={bankData.account_number}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.bankDetails?.account_number ? "true" : "false"}
          />
          {errors.bankDetails?.account_number && (
            <p className="text-xs text-red-500" role="alert">
              {errors.bankDetails.account_number.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankDetails.pix_key" className="text-sm font-medium">
            Chave PIX
          </Label>
          <Input
            id="bankDetails.pix_key"
            {...register("bankDetails.pix_key")}
            defaultValue={bankData.pix_key}
            className="border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm"
            aria-invalid={errors.bankDetails?.pix_key ? "true" : "false"}
          />
          {errors.bankDetails?.pix_key && (
            <p className="text-xs text-red-500" role="alert">
              {errors.bankDetails.pix_key.message}
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
          onClick={handleSubmit(onSubmitBank)}
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

export default BankForm;
