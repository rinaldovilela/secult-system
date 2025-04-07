// components/MaskedInput.tsx
"use client";

import { Input } from "@/components/ui/input";
import { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { IMaskInput } from "react-imask";

interface MaskedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  mask: string | Array<{ mask: string }>;
  onAccept?: (value: string) => void;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onAccept, className, ...props }, ref) => {
    return (
      <IMaskInput
        mask={mask}
        inputRef={ref}
        onAccept={(value: any, maskRef: any) => {
          const cleanValue = maskRef.unmaskedValue;
          onAccept?.(cleanValue);
        }}
        overwrite
        {...props}
        // Use the Input component directly without children
        // This is the key fix - we're not passing children to input
        // Instead we let IMaskInput handle the rendering internally
      />
    );
  }
);

MaskedInput.displayName = "MaskedInput";
