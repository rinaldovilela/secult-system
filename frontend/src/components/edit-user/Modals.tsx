import Image from "next/image";
import { Loader2, RotateCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface UploadDialogData {
  type: "video" | "profile_picture" | "portfolio" | "related_files";
  files: File[];
  previews: string[];
  rotation: number;
}

interface ViewDialogData {
  type: string;
  data: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ModalsProps {
  uploadDialog: UploadDialogData | null;
  setUploadDialog: (value: UploadDialogData | null) => void;
  viewDialog: ViewDialogData | null;
  setViewDialog: (value: ViewDialogData | null) => void;
  showCancelDialog: boolean;
  setShowCancelDialog: (value: boolean) => void;
  showPasswordDialog: boolean;
  setShowPasswordDialog: (value: boolean) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (value: boolean) => void;
  showPreviewDialog: boolean;
  setShowPreviewDialog: (value: boolean) => void;
  isSubmitting: boolean;
  uploadProgress: number;
  newPassword: string;
  setNewPassword: (value: string) => void;
  passwordError: string | null;
  setPasswordError: (value: string | null) => void;
  handleUploadFile: () => void;
  handleRotateImage: () => void;
  handleChangePassword: () => void;
  handleDeleteUser: () => void;
  resetForm: () => void;
  getChanges: () => { field: string; oldValue: string; newValue: string }[];
}

const Modals = ({
  uploadDialog,
  setUploadDialog,
  viewDialog,
  setViewDialog,
  showCancelDialog,
  setShowCancelDialog,
  showPasswordDialog,
  setShowPasswordDialog,
  showDeleteDialog,
  setShowDeleteDialog,
  showPreviewDialog,
  setShowPreviewDialog,
  isSubmitting,
  uploadProgress,
  newPassword,
  setNewPassword,
  passwordError,
  setPasswordError,
  handleUploadFile,
  handleRotateImage,
  handleChangePassword,
  handleDeleteUser,
  resetForm,
  getChanges,
}: ModalsProps) => {
  return (
    <>
      {/* Modal de Visualização de Alterações */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              Visualizar Alterações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getChanges().length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-semibold">
                  Alterações realizadas:
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  {getChanges().map((change, index) => (
                    <li key={index} className="text-sm sm:text-base">
                      <strong>{change.field}:</strong> De "
                      {change.oldValue || "N/A"}" para "
                      {change.newValue || "N/A"}"
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm sm:text-base text-muted-foreground">
                Nenhuma alteração detectada.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
              className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Fechar visualização de alterações"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Arquivo */}
      {uploadDialog && (
        <Dialog
          open={!!uploadDialog}
          onOpenChange={() => setUploadDialog(null)}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {uploadDialog.type === "profile_picture" &&
                  "Enviar Foto de Perfil"}
                {uploadDialog.type === "portfolio" && "Enviar Portfólio"}
                {uploadDialog.type === "video" && "Enviar Vídeo"}
                {uploadDialog.type === "related_files" &&
                  "Enviar Arquivos Relacionados"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {uploadDialog.previews.map((preview, index) => (
                <div key={index} className="relative">
                  {uploadDialog.type === "profile_picture" && (
                    <div className="relative w-full h-64 sm:h-80">
                      <Image
                        src={preview}
                        alt={`Prévia do arquivo ${index + 1}`}
                        fill
                        className="object-contain rounded-md"
                        style={{
                          transform: `rotate(${uploadDialog.rotation}deg)`,
                        }}
                        loading="lazy"
                      />
                    </div>
                  )}
                  {uploadDialog.type === "portfolio" && (
                    <iframe
                      src={preview}
                      className="w-full h-64 sm:h-80 border-none rounded-md"
                      title={`Prévia do portfólio ${index + 1}`}
                    />
                  )}
                  {uploadDialog.type === "video" && (
                    <video
                      src={preview}
                      controls
                      className="w-full h-64 sm:h-80 rounded-md"
                      title={`Prévia do vídeo ${index + 1}`}
                    />
                  )}
                  {uploadDialog.type === "related_files" && (
                    <div className="p-4 bg-muted rounded-md">
                      <p className="text-sm sm:text-base">
                        Arquivo: {uploadDialog.files[index].name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Tamanho:{" "}
                        {(uploadDialog.files[index].size / 1024 / 1024).toFixed(
                          2
                        )}{" "}
                        MB
                      </p>
                    </div>
                  )}
                  {uploadDialog.type === "profile_picture" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateImage}
                      className="absolute top-2 right-2 bg-background/80 border-muted-foreground/20 hover:bg-muted/20 text-primary transition-all duration-300 px-4 py-2"
                      aria-label="Rotacionar imagem"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  )}
                  {uploadDialog.type === "related_files" &&
                    uploadDialog.files.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadDialog({
                            ...uploadDialog,
                            files: uploadDialog.files.filter(
                              (_, i) => i !== index
                            ),
                            previews: uploadDialog.previews.filter(
                              (_, i) => i !== index
                            ),
                          });
                        }}
                        className="absolute top-2 right-2 bg-background/80 border-red-500/20 hover:bg-red-500/10 text-red-500 transition-all duration-300 px-4 py-2"
                        aria-label={`Remover arquivo ${uploadDialog.files[index].name}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                </div>
              ))}
              {isSubmitting && (
                <div className="space-y-2">
                  <Progress
                    value={uploadProgress}
                    className="w-full"
                    aria-label="Progresso do upload"
                  />
                  <p className="text-sm sm:text-base text-center text-muted-foreground">
                    Enviando... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUploadDialog(null)}
                disabled={isSubmitting}
                className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                aria-label="Cancelar upload"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadFile}
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                aria-label="Confirmar upload"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Visualização de Arquivo */}
      {viewDialog && (
        <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {viewDialog.type === "profile_picture" && "Foto de Perfil"}
                {viewDialog.type === "portfolio" && "Portfólio"}
                {viewDialog.type === "video" && "Vídeo"}
                {viewDialog.type === "related_files" && "Arquivos Relacionados"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewDialog.isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2
                    className="w-8 h-8 animate-spin text-primary"
                    aria-label="Carregando arquivo"
                  />
                </div>
              ) : viewDialog.error ? (
                <p className="text-red-600 text-sm sm:text-base">
                  {viewDialog.error}
                </p>
              ) : viewDialog.data ? (
                <>
                  {viewDialog.type === "profile_picture" && (
                    <div className="relative w-full h-64 sm:h-80">
                      <Image
                        src={viewDialog.data}
                        alt="Foto de perfil"
                        fill
                        className="object-contain rounded-md"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {viewDialog.type === "portfolio" && (
                    <iframe
                      src={viewDialog.data}
                      className="w-full h-64 sm:h-80 border-none rounded-md"
                      title="Portfólio"
                    />
                  )}
                  {viewDialog.type === "video" && (
                    <video
                      src={viewDialog.data}
                      controls
                      className="w-full h-64 sm:h-80 rounded-md"
                      title="Vídeo"
                    />
                  )}
                  {viewDialog.type === "related_files" && (
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Visualização de arquivos relacionados não suportada
                      diretamente.
                    </p>
                  )}
                </>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewDialog(null)}
                className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
                aria-label="Fechar visualização"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Confirmação de Cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-background rounded-lg shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl font-semibold">
              Descartar alterações?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">
              Todas as alterações não salvas serão perdidas. Tem certeza que
              deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Voltar"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetForm();
                setShowCancelDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Descartar alterações"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Alteração de Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-background rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">
              Alterar Senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="flex items-center gap-2 text-muted-foreground text-sm sm:text-base"
              >
                Nova Senha <span className="text-red-500 font-bold">*</span>
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Digite a nova senha"
                className="mt-1 bg-background border-muted-foreground/20 focus:ring-primary transition-all duration-300 text-sm sm:text-base max-w-md min-w-[200px]"
                aria-describedby="password-error"
                aria-label="Nova senha do usuário"
              />
              {passwordError && (
                <p
                  id="password-error"
                  className="text-red-600 text-xs sm:text-sm mt-1"
                >
                  {passwordError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setNewPassword("");
                setPasswordError(null);
              }}
              className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Cancelar alteração de senha"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Confirmar alteração de senha"
            >
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Deleção */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background rounded-lg shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl font-semibold">
              Deletar Usuário
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-muted-foreground">
              Esta ação não pode ser desfeita. O usuário será permanentemente
              removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-muted-foreground/20 hover:bg-muted/20 text-muted-foreground transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Cancelar deleção"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white transition-all duration-300 active:scale-95 px-4 py-2"
              aria-label="Confirmar deleção"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Modals;
