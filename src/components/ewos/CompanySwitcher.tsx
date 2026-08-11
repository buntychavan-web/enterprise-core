import { useState } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * CompanySwitcher — visual/UX shell for multi-tenant switching.
 * The list of companies must come from a backend endpoint when available.
 * Until then the trigger is disabled to avoid mock data.
 */
export function CompanySwitcher({
  companies,
  activeId,
  onSelect,
}: {
  companies?: { id: string; name: string }[];
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const list = companies ?? [];
  const active = list.find((c) => c.id === activeId);
  const disabled = list.length === 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-9 min-w-0 max-w-[14rem] shrink justify-between gap-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {active?.name ?? (disabled ? "No company" : "Select company")}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => onSelect?.(c.id)}>
            <span className="flex-1 truncate">{c.name}</span>
            {c.id === activeId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
