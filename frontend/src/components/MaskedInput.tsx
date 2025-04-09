"use client";

import { forwardRef } from "react";
import { IMaskInput, IMaskInputProps } from "react-imask";
import type { InputMask, MaskedOptions, FactoryArg } from "imask";
import { Label } from "@/components/ui/label";
import { FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

type MaskedInputProps = {
  label?: string;
  description?: string;
  error?: string;
  mask: MaskedOptions | string;
  onAccept?: (value: string) => void;
  className?: string;
} & Omit<
  IMaskInputProps<HTMLInputElement>,
  "mask" | "unmask" | "value" | "onAccept" | "className"
>;

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onAccept, className, label, description, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <Label>{label}</Label>}

        <IMaskInput
          // @ts-expect-error: mask aceita diversos tipos válidos em tempo de execução
          mask={mask}
          inputRef={ref}
          onAccept={(value: string, maskRef: InputMask<FactoryArg>) => {
            const cleanValue = maskRef.unmaskedValue;
            onAccept?.(cleanValue);
          }}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          overwrite
          {...props}
        />

        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && <FormMessage>{error}</FormMessage>}
      </div>
    );
  }
);

MaskedInput.displayName = "MaskedInput";
