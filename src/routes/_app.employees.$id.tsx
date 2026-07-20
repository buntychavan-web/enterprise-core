import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  GraduationCap,
  Heart,
  Laptop,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SAMPLE_EMPLOYEE, type EmployeeProfile } from "@/lib/mock/employee";

export const Route = createFileRoute("/_app/employees/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Employee ${params.id} — EWOS` }, { name: "robots", content: "noindex" }],
  }),
  component: EmployeeProfilePage,
});

function EmployeeProfilePage() {
  const { id } = Route.useParams();
  const employee: EmployeeProfile = { ...SAMPLE_EMPLOYEE, id, code: id };
  const fullName = `${employee.firstName} ${employee.lastName}`;
  const initials = (employee.firstName[0] ?? "") + (employee.lastName[0] ?? "");

  const statusTone =
    employee.status === "Active"
      ? "success"
      : employee.status === "On Leave"
        ? "warning"
        : "neutral";

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/employees">
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold sm:text-2xl">{fullName}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{employee.designation}</span>
                <span aria-hidden>•</span>
                <span>{employee.department}</span>
                <span aria-hidden>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {employee.location}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusChip tone={statusTone}>{employee.status}</StatusChip>
                <StatusChip tone="info">{employee.employmentType}</StatusChip>
                <StatusChip tone="neutral">Grade {employee.grade}</StatusChip>
                <StatusChip tone="neutral">{employee.code}</StatusChip>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button size="sm">Edit profile</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="personal">
            <User className="mr-1.5 h-3.5 w-3.5" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="employment">
            <Briefcase className="mr-1.5 h-3.5 w-3.5" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Phone className="mr-1.5 h-3.5 w-3.5" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="emergency">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Emergency
          </TabsTrigger>
          <TabsTrigger value="bank">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Bank
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="qualifications">
            <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
            Qualifications
          </TabsTrigger>
          <TabsTrigger value="experience">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Experience
          </TabsTrigger>
          <TabsTrigger value="family">
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Family
          </TabsTrigger>
          <TabsTrigger value="assets">
            <Laptop className="mr-1.5 h-3.5 w-3.5" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <SectionCard title="Personal information">
            <Field label="Date of birth" value={employee.personal.dob} />
            <Field label="Gender" value={employee.personal.gender} />
            <Field label="Nationality" value={employee.personal.nationality} />
            <Field label="Marital status" value={employee.personal.maritalStatus} />
            <Field label="Blood group" value={employee.personal.bloodGroup} />
            <Field label="PAN" value={employee.personal.pan} />
            <Field label="Aadhaar" value={employee.personal.aadhaar} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <SectionCard title="Employment">
            <Field label="Employee code" value={employee.code} />
            <Field label="Designation" value={employee.designation} />
            <Field label="Department" value={employee.department} />
            <Field label="Grade" value={employee.grade} />
            <Field label="Cost centre" value={employee.costCentre} />
            <Field label="Employment type" value={employee.employmentType} />
            <Field label="Reporting to" value={employee.reportingTo} />
            <Field label="Date of joining" value={employee.dateOfJoining} />
            <Field label="Location" value={employee.location} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Contact">
              <Field
                label="Work email"
                value={employee.email}
                icon={<Mail className="h-3.5 w-3.5" />}
              />
              <Field
                label="Phone"
                value={employee.phone}
                icon={<Phone className="h-3.5 w-3.5" />}
              />
            </SectionCard>
            <SectionCard title="Address">
              <Field label="Current address" value={employee.address.current} />
              <Field label="Permanent address" value={employee.address.permanent} />
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="mt-4">
          <SectionCard title="Emergency contacts">
            <div className="col-span-full grid gap-3 sm:grid-cols-2">
              {employee.emergencyContacts.map((c) => (
                <div key={c.name} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{c.name}</div>
                    <StatusChip tone="info">{c.relation}</StatusChip>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <SectionCard title="Bank details">
            <Field label="Bank" value={employee.bank.bankName} />
            <Field label="Account number" value={employee.bank.accountNumber} />
            <Field label="IFSC" value={employee.bank.ifsc} />
            <Field label="Branch" value={employee.bank.branch} />
          </SectionCard>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.documents.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="text-sm font-medium">{d.name}</TableCell>
                      <TableCell className="text-sm">{d.type}</TableCell>
                      <TableCell className="text-sm">{d.uploadedAt}</TableCell>
                      <TableCell>
                        <StatusChip
                          tone={
                            d.status === "Verified"
                              ? "success"
                              : d.status === "Pending"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {d.status}
                        </StatusChip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qualifications" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Degree</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.qualifications.map((q) => (
                    <TableRow key={q.degree + q.year}>
                      <TableCell className="text-sm font-medium">{q.degree}</TableCell>
                      <TableCell className="text-sm">{q.institution}</TableCell>
                      <TableCell className="text-sm">{q.year}</TableCell>
                      <TableCell className="text-sm">{q.grade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.experience.map((e) => (
                    <TableRow key={e.company}>
                      <TableCell className="text-sm font-medium">{e.company}</TableCell>
                      <TableCell className="text-sm">{e.role}</TableCell>
                      <TableCell className="text-sm">{e.from}</TableCell>
                      <TableCell className="text-sm">{e.to}</TableCell>
                      <TableCell className="text-sm">{e.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Relation</TableHead>
                    <TableHead>Date of birth</TableHead>
                    <TableHead>Dependent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.family.map((f) => (
                    <TableRow key={f.name}>
                      <TableCell className="text-sm font-medium">
                        <span className="inline-flex items-center gap-2">
                          <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                          {f.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{f.relation}</TableCell>
                      <TableCell className="text-sm">{f.dob}</TableCell>
                      <TableCell>
                        {f.dependent ? (
                          <StatusChip tone="success">Yes</StatusChip>
                        ) : (
                          <StatusChip tone="neutral">No</StatusChip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Assigned on</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.assets.map((a) => (
                    <TableRow key={a.tag}>
                      <TableCell className="text-sm font-medium">{a.tag}</TableCell>
                      <TableCell className="text-sm">{a.item}</TableCell>
                      <TableCell className="text-sm">{a.assignedOn}</TableCell>
                      <TableCell>
                        <StatusChip tone={a.status === "Assigned" ? "info" : "neutral"}>
                          {a.status}
                        </StatusChip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative ml-3 space-y-6 border-l border-border pl-6">
                {employee.timeline.map((t) => (
                  <li key={t.id} className="relative">
                    <span className="absolute -left-[27px] top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-background bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium">{t.title}</div>
                      <StatusChip tone={t.tone}>{t.at}</StatusChip>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
        {icon}
        {value}
      </div>
    </div>
  );
}
