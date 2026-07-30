import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortState = { field: string; direction: "asc" | "desc" } | null;

export function nextSort(current: SortState, field: string): SortState {
  if (!current || current.field !== field) return { field, direction: "asc" };
  if (current.direction === "asc") return { field, direction: "desc" };
  return null;
}

/** Spring Data `sort` parameter, e.g. `lastName,asc`. */
export function sortParam(sort: SortState): string | undefined {
  return sort ? `${sort.field},${sort.direction}` : undefined;
}

export function SortableHead({
  field,
  sort,
  onSort,
  children,
  className,
}: {
  field: string;
  sort: SortState;
  onSort: (field: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = sort?.field === field;
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 rounded text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {children}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </TableHead>
  );
}
