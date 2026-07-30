import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ColumnOption = { key: string; label: string; locked?: boolean };

/**
 * Shared column visibility control. The caller owns the visible-key set so it
 * can persist the choice (see `useColumnPreference`).
 */
export function ColumnChooser({
  columns,
  visible,
  onChange,
}: {
  columns: ColumnOption[];
  visible: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (key: string, on: boolean) => {
    onChange(on ? [...visible, key] : visible.filter((k) => k !== key));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-1 p-1">
          {columns.map((col) => {
            const id = `col-${col.key}`;
            const checked = col.locked || visible.includes(col.key);
            return (
              <div key={col.key} className="flex items-center gap-2 rounded px-2 py-1.5">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={col.locked}
                  onCheckedChange={(v) => toggle(col.key, v === true)}
                />
                <Label htmlFor={id} className="text-sm font-normal">
                  {col.label}
                </Label>
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
