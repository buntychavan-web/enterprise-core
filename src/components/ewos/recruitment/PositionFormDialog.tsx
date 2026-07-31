import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { humanizeEnum } from "@/lib/format";
import {
  EMPLOYMENT_TYPES,
  jobPositionsApi,
  type JobPositionResponse,
} from "@/lib/recruitment-api";

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is required")
      .max(64, "Max 64 characters")
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Letters, digits, dot, underscore and dash only"),
    title: z.string().trim().min(1, "Title is required").max(256, "Max 256 characters"),
    description: z.string().trim().max(4000, "Max 4000 characters").optional().or(z.literal("")),
    location: z.string().trim().max(256, "Max 256 characters").optional().or(z.literal("")),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    grade: z.string().trim().max(64, "Max 64 characters").optional().or(z.literal("")),
    salaryCurrency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO code, e.g. INR")
      .optional()
      .or(z.literal("")),
    salaryMin: z.string().optional().or(z.literal("")),
    salaryMax: z.string().optional().or(z.literal("")),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const min = v.salaryMin ? Number(v.salaryMin) : undefined;
    const max = v.salaryMax ? Number(v.salaryMax) : undefined;
    if (min !== undefined && (Number.isNaN(min) || min < 0))
      ctx.addIssue({ code: "custom", path: ["salaryMin"], message: "Enter a positive amount" });
    if (max !== undefined && (Number.isNaN(max) || max < 0))
      ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "Enter a positive amount" });
    if (min !== undefined && max !== undefined && !Number.isNaN(min) && !Number.isNaN(max) && max < min)
      ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "Maximum must exceed minimum" });
  });

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  code: "",
  title: "",
  description: "",
  location: "",
  employmentType: "FULL_TIME",
  grade: "",
  salaryCurrency: "",
  salaryMin: "",
  salaryMax: "",
  active: true,
};

export function PositionFormDialog({
  open,
  onOpenChange,
  position,
  tenantId,
  companyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  position?: JobPositionResponse | null;
  tenantId?: string;
  companyId?: string;
}) {
  const qc = useQueryClient();
  const editing = !!position;

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    form.reset(
      position
        ? {
            code: position.code ?? "",
            title: position.title ?? "",
            description: position.description ?? "",
            location: position.location ?? "",
            employmentType: position.employmentType ?? "FULL_TIME",
            grade: position.grade ?? "",
            salaryCurrency: position.salaryCurrency ?? "",
            salaryMin: position.salaryMin != null ? String(position.salaryMin) : "",
            salaryMax: position.salaryMax != null ? String(position.salaryMax) : "",
            active: position.active ?? true,
          }
        : EMPTY,
    );
  }, [open, position, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const common = {
        title: values.title,
        description: values.description || undefined,
        location: values.location || undefined,
        employmentType: values.employmentType,
        grade: values.grade || undefined,
        salaryCurrency: values.salaryCurrency || undefined,
        salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
        salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
        active: values.active,
      };
      if (position) return jobPositionsApi.update(position.id, common);
      if (!tenantId || !companyId) throw new Error("Company scope is not resolved yet.");
      return jobPositionsApi.create({ tenantId, companyId, code: values.code, ...common });
    },
    onSuccess: () => {
      toast.success(editing ? "Position updated" : "Position created");
      qc.invalidateQueries({ queryKey: ["recruitment", "positions"] });
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.length) {
        for (const fe of err.fieldErrors) {
          form.setError(fe.field as keyof FormValues, { message: fe.message });
        }
      }
      toast.error(err instanceof Error ? err.message : "Could not save the position");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit job position" : "New job position"}</DialogTitle>
          <DialogDescription>
            Positions are the long-lived seats requisitions are raised against.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position code</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={editing} placeholder="ENG-SE-II" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Software Engineer II" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {humanizeEnum(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Pune, IN" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="G5" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary currency</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="INR" maxLength={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary min</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="decimal" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="salaryMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salary max</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="decimal" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Role scope and responsibilities" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                  <FormLabel className="mb-0">Active in the catalogue</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create position"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
