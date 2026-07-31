import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, employeesApi, organizationApi, displayName } from "@/lib/api-client";
import { humanizeEnum } from "@/lib/format";
import {
  EMPLOYMENT_TYPES,
  REQUISITION_PRIORITIES,
  jobPositionsApi,
  jobRequisitionsApi,
  type JobRequisitionResponse,
} from "@/lib/recruitment-api";

const NONE = "__none__";

const schema = z.object({
  requisitionNumber: z
    .string()
    .trim()
    .min(1, "Requisition number is required")
    .max(64, "Max 64 characters")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Letters, digits, dot, slash, underscore, dash"),
  jobPositionId: z.string().min(1, "Select a job position"),
  title: z.string().trim().min(1, "Title is required").max(256, "Max 256 characters"),
  departmentOrgUnitId: z.string().optional(),
  location: z.string().trim().max(256, "Max 256 characters").optional().or(z.literal("")),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  headcount: z.coerce.number().int("Whole numbers only").min(1, "At least 1 headcount"),
  priority: z.enum(REQUISITION_PRIORITIES),
  justification: z.string().trim().max(4000, "Max 4000 characters").optional().or(z.literal("")),
  hiringManagerId: z.string().optional(),
  recruiterId: z.string().optional(),
  targetStartDate: z.string().optional().or(z.literal("")),
  budgetCurrency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter ISO code, e.g. INR")
    .optional()
    .or(z.literal("")),
  budgetAmount: z.string().optional().or(z.literal("")),
});

type FormValues = z.input<typeof schema>;
type ParsedValues = z.output<typeof schema>;

const EMPTY: FormValues = {
  requisitionNumber: "",
  jobPositionId: "",
  title: "",
  departmentOrgUnitId: NONE,
  location: "",
  employmentType: "FULL_TIME",
  headcount: 1,
  priority: "MEDIUM",
  justification: "",
  hiringManagerId: NONE,
  recruiterId: NONE,
  targetStartDate: "",
  budgetCurrency: "",
  budgetAmount: "",
};

const clean = (v?: string) => (!v || v === NONE ? undefined : v);

export function RequisitionFormDialog({
  open,
  onOpenChange,
  requisition,
  tenantId,
  companyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  requisition?: JobRequisitionResponse | null;
  tenantId?: string;
  companyId?: string;
}) {
  const qc = useQueryClient();
  const editing = !!requisition;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const positions = useQuery({
    queryKey: ["recruitment", "positions", companyId],
    queryFn: ({ signal }) => jobPositionsApi.list(companyId!, signal),
    enabled: open && !!companyId,
  });

  const units = useQuery({
    queryKey: ["organization", "units", "options"],
    queryFn: ({ signal }) => organizationApi.units.list({ page: 0, size: 200 }, signal),
    enabled: open,
  });

  const people = useQuery({
    queryKey: ["employees", "options"],
    queryFn: ({ signal }) => employeesApi.search({ page: 0, size: 200 }, signal),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      requisition
        ? {
            requisitionNumber: requisition.requisitionNumber ?? "",
            jobPositionId: requisition.jobPositionId ?? "",
            title: requisition.title ?? "",
            departmentOrgUnitId: requisition.departmentOrgUnitId ?? NONE,
            location: requisition.location ?? "",
            employmentType: requisition.employmentType ?? "FULL_TIME",
            headcount: requisition.headcount ?? 1,
            priority: requisition.priority ?? "MEDIUM",
            justification: requisition.justification ?? "",
            hiringManagerId: requisition.hiringManagerId ?? NONE,
            recruiterId: requisition.recruiterId ?? NONE,
            targetStartDate: requisition.targetStartDate ?? "",
            budgetCurrency: requisition.budgetCurrency ?? "",
            budgetAmount: requisition.budgetAmount != null ? String(requisition.budgetAmount) : "",
          }
        : EMPTY,
    );
  }, [open, requisition, form]);

  const mutation = useMutation({
    mutationFn: async (values: ParsedValues) => {
      const common = {
        title: values.title,
        departmentOrgUnitId: clean(values.departmentOrgUnitId),
        location: values.location || undefined,
        employmentType: values.employmentType,
        headcount: values.headcount,
        priority: values.priority,
        justification: values.justification || undefined,
        hiringManagerId: clean(values.hiringManagerId),
        recruiterId: clean(values.recruiterId),
        targetStartDate: values.targetStartDate || undefined,
        budgetCurrency: values.budgetCurrency || undefined,
        budgetAmount: values.budgetAmount ? Number(values.budgetAmount) : undefined,
      };
      if (requisition) return jobRequisitionsApi.update(requisition.id, common);
      if (!tenantId || !companyId) throw new Error("Company scope is not resolved yet.");
      return jobRequisitionsApi.create({
        tenantId,
        companyId,
        requisitionNumber: values.requisitionNumber,
        jobPositionId: values.jobPositionId,
        ...common,
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Requisition updated" : "Requisition created as draft");
      qc.invalidateQueries({ queryKey: ["recruitment"] });
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.length) {
        for (const fe of err.fieldErrors)
          form.setError(fe.field as keyof FormValues, { message: fe.message });
      }
      toast.error(err instanceof Error ? err.message : "Could not save the requisition");
    },
  });

  const positionOptions = positions.data ?? [];
  const unitOptions = units.data?.content ?? [];
  const peopleOptions = people.data?.content ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit requisition" : "New job requisition"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Only draft requisitions can be edited."
              : "Requisitions are created as drafts and then submitted for approval."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => mutation.mutate(schema.parse(v)))}
          >
            <FormField
              control={form.control}
              name="requisitionNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisition number</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={editing} placeholder="REQ-2026-001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="jobPositionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job position</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={editing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            positions.isLoading ? "Loading positions…" : "Select a position"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positionOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!positions.isLoading && positionOptions.length === 0 && (
                    <FormDescription>
                      No positions in this company yet — create one first.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Requisition title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Senior Software Engineer — Platform" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departmentOrgUnitId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {unitOptions.map((u) => (
                        <SelectItem key={String(u.id)} value={String(u.id)}>
                          {String(u.name ?? u.code ?? u.id)}
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
              name="headcount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headcount</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REQUISITION_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {humanizeEnum(p)}
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
              name="targetStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target start date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hiringManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hiring manager</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {peopleOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {displayName(e)}
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
              name="recruiterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recruiter</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {peopleOptions.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {displayName(e)}
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
              name="budgetCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget currency</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={3} placeholder="INR" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="budgetAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget amount</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="decimal" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Justification</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Business case for this hire" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create draft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
