/**
 * Mock employee profile — sample data. Swap with real API when backend ships
 * GET /api/employees/{id} and related detail endpoints.
 */

export type EmployeeProfile = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  location: string;
  status: "Active" | "On Leave" | "Inactive";
  email: string;
  phone: string;
  dateOfJoining: string;
  reportingTo: string;
  employmentType: string;
  grade: string;
  costCentre: string;
  personal: {
    dob: string;
    gender: string;
    nationality: string;
    maritalStatus: string;
    bloodGroup: string;
    pan: string;
    aadhaar: string;
  };
  address: { current: string; permanent: string };
  emergencyContacts: Array<{
    name: string;
    relation: string;
    phone: string;
    email?: string;
  }>;
  bank: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  };
  documents: Array<{ name: string; type: string; uploadedAt: string; status: "Verified" | "Pending" | "Rejected" }>;
  qualifications: Array<{ degree: string; institution: string; year: string; grade: string }>;
  experience: Array<{ company: string; role: string; from: string; to: string; location: string }>;
  family: Array<{ name: string; relation: string; dob: string; dependent: boolean }>;
  assets: Array<{ tag: string; item: string; assignedOn: string; status: "Assigned" | "Returned" }>;
  timeline: Array<{ id: string; at: string; title: string; description: string; tone: "info" | "success" | "warning" | "neutral" }>;
};

export const SAMPLE_EMPLOYEE: EmployeeProfile = {
  id: "EMP-1001",
  code: "EMP-1001",
  firstName: "Rahul",
  lastName: "Menon",
  designation: "Senior Product Engineer",
  department: "Engineering",
  location: "Bengaluru HQ",
  status: "Active",
  email: "rahul.menon@ewos.example",
  phone: "+91 98765 43210",
  dateOfJoining: "2022-03-14",
  reportingTo: "Priya Nair",
  employmentType: "Full-time",
  grade: "L5",
  costCentre: "CC-021",
  personal: {
    dob: "1993-08-22",
    gender: "Male",
    nationality: "Indian",
    maritalStatus: "Married",
    bloodGroup: "B+",
    pan: "ABCDE1234F",
    aadhaar: "•••• •••• 4321",
  },
  address: {
    current: "42, Indiranagar 3rd Cross, Bengaluru 560038",
    permanent: "House 12, MG Road, Kochi 682016",
  },
  emergencyContacts: [
    { name: "Anjali Menon", relation: "Spouse", phone: "+91 98111 22233", email: "anjali@example.com" },
    { name: "Suresh Menon", relation: "Father", phone: "+91 94477 88990" },
  ],
  bank: {
    bankName: "HDFC Bank",
    accountNumber: "•••• •••• 7821",
    ifsc: "HDFC0001234",
    branch: "Indiranagar, Bengaluru",
  },
  documents: [
    { name: "Offer Letter.pdf", type: "Offer", uploadedAt: "2022-03-01", status: "Verified" },
    { name: "PAN Card.jpg", type: "ID Proof", uploadedAt: "2022-03-02", status: "Verified" },
    { name: "Aadhaar.pdf", type: "ID Proof", uploadedAt: "2022-03-02", status: "Verified" },
    { name: "Prev-Experience-Letter.pdf", type: "Experience", uploadedAt: "2022-03-05", status: "Pending" },
  ],
  qualifications: [
    { degree: "B.Tech Computer Science", institution: "NIT Calicut", year: "2015", grade: "8.7 CGPA" },
    { degree: "MS Software Systems", institution: "BITS Pilani", year: "2019", grade: "Distinction" },
  ],
  experience: [
    { company: "Nova Labs", role: "Software Engineer", from: "2015-07", to: "2018-11", location: "Bengaluru" },
    { company: "Helix Systems", role: "Senior Engineer", from: "2018-12", to: "2022-02", location: "Hyderabad" },
  ],
  family: [
    { name: "Anjali Menon", relation: "Spouse", dob: "1994-04-11", dependent: true },
    { name: "Aarav Menon", relation: "Son", dob: "2021-09-05", dependent: true },
  ],
  assets: [
    { tag: "LAP-2231", item: "MacBook Pro 14\" M3", assignedOn: "2022-03-15", status: "Assigned" },
    { tag: "MON-0910", item: "Dell U2723QE 27\"", assignedOn: "2022-03-15", status: "Assigned" },
    { tag: "PHN-0421", item: "iPhone 13", assignedOn: "2023-01-20", status: "Returned" },
  ],
  timeline: [
    { id: "t1", at: "2026-07-10", title: "Promoted to Senior Product Engineer", description: "Grade updated to L5.", tone: "success" },
    { id: "t2", at: "2026-04-01", title: "Completed AWS certification", description: "Solutions Architect Associate.", tone: "info" },
    { id: "t3", at: "2025-12-20", title: "Annual appraisal", description: "Rating: Exceeds expectations.", tone: "success" },
    { id: "t4", at: "2024-06-15", title: "Transferred to Platform team", description: "From Growth Engineering.", tone: "neutral" },
    { id: "t5", at: "2022-03-14", title: "Joined EWOS", description: "Bengaluru HQ, Engineering.", tone: "info" },
  ],
};
