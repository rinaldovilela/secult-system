import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, DollarSign } from "lucide-react";

interface SearchFiltersProps {
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  pendingPayments: boolean;
  setPendingPayments: (value: boolean) => void;
}

export function SearchFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  pendingPayments,
  setPendingPayments,
}: SearchFiltersProps) {
  return (
    <div className="bg-muted/50 p-4 rounded-md shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-3">
        Filtros Adicionais
      </h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              Data Inicial
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
              aria-label="Data inicial para filtro"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              Data Final
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border-muted-foreground/20 bg-background shadow-sm focus:border-primary focus:ring-primary/50 transition-all duration-300"
              aria-label="Data final para filtro"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="pendingPayments"
            checked={pendingPayments}
            onCheckedChange={(checked) => setPendingPayments(!!checked)}
            aria-label="Mostrar apenas eventos com pagamentos pendentes"
          />
          <label
            htmlFor="pendingPayments"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <DollarSign className="w-5 h-5 text-primary" />
            Mostrar apenas eventos com pagamentos pendentes
          </label>
        </div>
      </div>
    </div>
  );
}
