import { cn } from "@/lib/utils";

export function SkeletonResultItem() {
  return (
    <div
      className={cn(
        "bg-background shadow-md rounded-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse"
      )}
    >
      <div className="space-y-3 w-full">
        {/* Placeholder para o título */}
        <div className="h-6 w-3/4 bg-muted rounded" />
        <div className="space-y-2">
          {/* Placeholder para os detalhes (email, data, etc.) */}
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {/* Placeholder para os botões */}
        <div className="h-9 w-full sm:w-32 bg-muted rounded-md" />
        <div className="h-9 w-full sm:w-24 bg-muted rounded-md" />
      </div>
    </div>
  );
}
