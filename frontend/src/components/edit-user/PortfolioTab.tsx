"use client";

import { useState, useCallback } from "react";
import { Loader2, File, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioTabProps {
  profilePreview: string | null;
  handleFileChange: (
    type: "profile_picture" | "portfolio" | "video" | "related_files",
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handleViewFile: (type: string) => void;
  handleClearFile: (type: string) => void;
  portfolioData: string | null;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({
  profilePreview,
  handleFileChange,
  handleViewFile,
  handleClearFile,
  portfolioData,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const renderFileSection = useCallback(
    (
      type: "profile_picture" | "portfolio" | "video" | "related_files",
      label: string,
      fileData: string | null
    ) => (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 p-2 sm:p-4 border-b border-muted-foreground/20">
        <label className="text-sm sm:text-base font-medium w-full sm:w-40">
          {label}
        </label>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="file"
            accept={
              type === "profile_picture"
                ? "image/*"
                : type === "portfolio"
                ? "application/pdf"
                : type === "video"
                ? "video/*"
                : "*"
            }
            onChange={(e) => {
              setIsUploading(true);
              handleFileChange(type, e);
              setIsUploading(false);
            }}
            className="hidden"
            id={type}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
            disabled={isUploading}
          >
            <label htmlFor={type}>
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1 sm:mr-2" />
              ) : (
                <File className="w-4 h-4 mr-1 sm:mr-2" />
              )}
              {fileData ? "Substituir" : "Enviar"}
            </label>
          </Button>
          {fileData && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewFile(type)}
                className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95"
              >
                <Eye className="w-4 h-4 mr-1 sm:mr-2" />
                Visualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClearFile(type)}
                className="border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all duration-300 active:scale-95"
              >
                <X className="w-4 h-4 mr-1 sm:mr-2" />
                Remover
              </Button>
            </>
          )}
        </div>
      </div>
    ),
    [handleFileChange, handleViewFile, handleClearFile, isUploading]
  );

  return (
    <div className="p-2 sm:p-4">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">
        Portfólio e Arquivos
      </h3>
      <div className="space-y-2 sm:space-y-4">
        {renderFileSection("profile_picture", "Foto de Perfil", profilePreview)}
        {renderFileSection("portfolio", "Portfólio (PDF)", portfolioData)}
        {renderFileSection("video", "Vídeo", null)}
        {renderFileSection("related_files", "Arquivos Relacionados", null)}
      </div>
    </div>
  );
};

export default PortfolioTab;
