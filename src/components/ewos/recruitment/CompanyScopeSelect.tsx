import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { CompanyOption } from "@/hooks/use-active-company";

/** Company scope picker for recruitment endpoints that require `companyId`. */
export function CompanyScopeSelect({
  companies,
  companyId,
  onChange,
}: {
  companies: CompanyOption[];
  companyId?: string;
  onChange: (id: string) => void;
}) {
  if (companies.length <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="recruitment-company" className="text-xs text-muted-foreground">
        Company
      </Label>
      <Select value={companyId} onValueChange={onChange}>
        <SelectTrigger id="recruitment-company" className="h-9 w-[13rem]">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
