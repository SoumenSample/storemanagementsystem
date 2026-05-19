"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmployeeSchema, updateEmployeeSchema, type CreateEmployeeInput } from "@/schemas/employee";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

type EmployeeBusinessRole = "CASHIER" | "INVENTORY_MANAGER";
type EmployeeRoleSelectValue = EmployeeBusinessRole | "NONE";

type EmployeeFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  address: string;
  city: string;
  state: string;
  zipCode: string;
  aadharNumber?: string;
  panNumber?: string;
  bankAccountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  designation: string;
  department: string;
  employeeId: string;
  dateOfJoining: string;
  employmentType: "Full-Time" | "Part-Time" | "Contract" | "Intern";
  status: "Active" | "Inactive" | "On Leave" | "Terminated";
  baseSalary: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
};

type EmployeeRecord = EmployeeFormData & {
  _id?: string;
  userId?: string | null;
  businessRole?: EmployeeBusinessRole | null;
  role?: string | null;
};

type EmployeeSubmitPayload = CreateEmployeeInput & {
  businessRole?: EmployeeBusinessRole;
};

type FieldErrors = Partial<Record<keyof EmployeeFormData, string>>;

function createEmptyEmployeeFormData(): EmployeeFormData {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "Male",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    aadharNumber: "",
    panNumber: "",
    bankAccountNumber: "",
    bankName: "",
    ifscCode: "",
    designation: "",
    department: "",
    employeeId: "",
    dateOfJoining: "",
    employmentType: "Full-Time",
    status: "Active",
    baseSalary: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
  };
}

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toInputValue(value?: string | null) {
  return value ?? "";
}

function normalizeEmployeeFormData(employee?: EmployeeRecord | null): EmployeeFormData {
  if (!employee) {
    return createEmptyEmployeeFormData();
  }

  return {
    firstName: toInputValue(employee.firstName),
    lastName: toInputValue(employee.lastName),
    email: toInputValue(employee.email),
    phone: toInputValue(employee.phone),
    dateOfBirth: toDateInputValue((employee as EmployeeFormData & { dateOfBirth?: string | Date | null }).dateOfBirth),
    gender: employee.gender || "Male",
    address: toInputValue(employee.address),
    city: toInputValue(employee.city),
    state: toInputValue(employee.state),
    zipCode: toInputValue(employee.zipCode),
    aadharNumber: toInputValue(employee.aadharNumber),
    panNumber: toInputValue(employee.panNumber),
    bankAccountNumber: toInputValue(employee.bankAccountNumber),
    bankName: toInputValue(employee.bankName),
    ifscCode: toInputValue(employee.ifscCode),
    designation: toInputValue(employee.designation),
    department: toInputValue(employee.department),
    employeeId: toInputValue(employee.employeeId),
    dateOfJoining: toDateInputValue((employee as EmployeeFormData & { dateOfJoining?: string | Date | null }).dateOfJoining),
    employmentType: employee.employmentType || "Full-Time",
    status: (employee.status as "Active" | "Inactive" | "On Leave" | "Terminated") || "Active",
    baseSalary: String(employee.baseSalary ?? ""),
    emergencyContactName: toInputValue(employee.emergencyContactName),
    emergencyContactPhone: toInputValue(employee.emergencyContactPhone),
    emergencyContactRelation: toInputValue(employee.emergencyContactRelation),
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-sm text-red-500">{message}</p>;
}

function normalizeBusinessRole(value?: string | null): EmployeeRoleSelectValue {
  if (!value) {
    return "NONE";
  }

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "CASHIER" || normalized === "INVENTORY_MANAGER") {
    return normalized;
  }

  return "NONE";
}

function normalizeIncomingRole(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function getRoleLabel(value: EmployeeRoleSelectValue) {
  if (value === "CASHIER") return "Cashier";
  if (value === "INVENTORY_MANAGER") return "Inventory Manager";

  return "No role";
}

function getDisplayedRoleLabel(selectedRole: EmployeeRoleSelectValue, incomingRole: string | null) {
  if (selectedRole !== "NONE") {
    return getRoleLabel(selectedRole);
  }

  if (incomingRole === "OWNER") {
    return "Owner";
  }

  if (incomingRole === "ADMIN") {
    return "Admin";
  }

  return getRoleLabel(selectedRole);
}

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeRecord | null;
  mode?: "create" | "view" | "edit";
}

export function EmployeeModal({ open, onOpenChange, employee, mode = "create" }: EmployeeModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<EmployeeFormData>(() => normalizeEmployeeFormData(employee));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [employeeId, setEmployeeId] = useState<string>("");
  const { data: session } = useSession();
  const isOwnerOrAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";
  const [selectedRole, setSelectedRole] = useState<EmployeeRoleSelectValue>("NONE");
  const [incomingRole, setIncomingRole] = useState<string | null>(null);
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const targetEmployeeId = employee?._id ?? employeeId;

  // Update form data when employee prop changes (for view/edit modes)
  useEffect(() => {
    if (open) {
      if (employee) {
        // Edit mode: load employee data
        setFormData(normalizeEmployeeFormData(employee));
        setEmployeeId(employee._id || "");
        const currentRole = normalizeIncomingRole(employee.businessRole ?? employee.role ?? null);
        setIncomingRole(currentRole);
        setSelectedRole(normalizeBusinessRole(currentRole));
        setFieldErrors({});
      } else {
        // Create mode: reset form to empty
        setFormData(createEmptyEmployeeFormData());
        setEmployeeId("");
        setIncomingRole(null);
        setSelectedRole("NONE");
        setFieldErrors({});
      }
    }
  }, [open, employee]);

  const mutation = useMutation({
    mutationFn: async (data: EmployeeSubmitPayload) => {
      const isUpdate = isEditMode && Boolean(targetEmployeeId);

      if (isEditMode && !targetEmployeeId) {
        throw new Error("Missing employee id for update");
      }

      const url = isUpdate
        ? `/api/employees/${targetEmployeeId}`
        : "/api/employees";
      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(
          result.error || (isUpdate ? "Failed to update employee" : "Failed to create employee")
        ) as Error & {
          field?: keyof EmployeeFormData;
          details?: Record<string, string[]>;
        };

        if (typeof result.field === "string") {
          error.field = result.field as keyof EmployeeFormData;
        }

        if (result.issues?.fieldErrors) {
          error.details = result.issues.fieldErrors as Record<string, string[]>;
        }

        throw error;
      }

      return result;
    },
    onSuccess: () => {
      const message = isEditMode ? "Employee updated successfully" : "Employee created successfully";
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      onOpenChange(false);
      setFormData(createEmptyEmployeeFormData());
      setFieldErrors({});
    },
    onError: (error) => {
      const apiError = error as Error & {
        field?: keyof EmployeeFormData;
        details?: Record<string, string[]>;
      };

      if (apiError.field) {
        setFieldErrors((prev) => ({
          ...prev,
          [apiError.field as keyof EmployeeFormData]: apiError.message,
        }));
        toast.error(apiError.message);
        return;
      }

      if (apiError.details) {
        const nextErrors: FieldErrors = {};

        for (const [field, messages] of Object.entries(apiError.details)) {
          if (messages?.length) {
            nextErrors[field as keyof EmployeeFormData] = messages[0];
          }
        }

        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
          toast.error("Please fix the highlighted fields");
          return;
        }
      }

      toast.error(apiError.message);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewMode) return;
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name as keyof EmployeeFormData];
      return next;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (isViewMode) return;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name as keyof EmployeeFormData];
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewMode) {
      onOpenChange(false);
      return;
    }

    const baseSalary = Number(formData.baseSalary);
    
    // Dates should already be in YYYY-MM-DD format from input fields
    // Just ensure they're not empty
    if (!formData.dateOfBirth || !formData.dateOfJoining) {
      toast.error("Please fill in all required date fields");
      return;
    }

    const payload = {
      ...formData,
      baseSalary,
      dateOfBirth: formData.dateOfBirth,
      dateOfJoining: formData.dateOfJoining,
      businessRole: selectedRole === "NONE" ? undefined : (selectedRole as EmployeeBusinessRole),
    };

    // Use updateEmployeeSchema for edit mode (partial), createEmployeeSchema for create mode (full)
    const schema = (isEditMode ? updateEmployeeSchema : createEmployeeSchema).extend({
      businessRole: z.enum(["CASHIER", "INVENTORY_MANAGER"]).optional(),
    });
    const validation = schema.safeParse(payload);

    if (!validation.success) {
      const nextErrors: FieldErrors = {};

      for (const issue of validation.error.issues) {
        const path = issue.path[0];
        if (typeof path === "string" && !nextErrors[path as keyof EmployeeFormData]) {
          nextErrors[path as keyof EmployeeFormData] = issue.message;
        }
      }

      setFieldErrors(nextErrors);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setFieldErrors({});
    mutation.mutate(validation.data as EmployeeSubmitPayload);
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isViewMode ? "View Employee" : isEditMode ? "Edit Employee" : "Add New Employee"}
      size="lg"
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="salary">Salary</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.firstName} />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.lastName} />
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <div>
                      <Label htmlFor="role">Assign Role (optional)</Label>
                      <Select
                        value={normalizeBusinessRole(selectedRole)}
                        onValueChange={(value) => setSelectedRole(normalizeBusinessRole(value))}
                      >
                        <SelectTrigger className="w-full md:max-w-xs">
                          <SelectValue placeholder="No role">{getDisplayedRoleLabel(normalizeBusinessRole(selectedRole), incomingRole)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">No role</SelectItem>
                          <SelectItem value="CASHIER">Cashier</SelectItem>
                          <SelectItem value="INVENTORY_MANAGER">Inventory Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedRole === "NONE" && (incomingRole === "OWNER" || incomingRole === "ADMIN") && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Current access role is {incomingRole}. Only Cashier and Inventory Manager are editable here.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.email} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10 digit number"
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.phone} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.dateOfBirth} />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender *</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => handleSelectChange("gender", value)}
                        disabled={isViewMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError message={fieldErrors.gender} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={isViewMode}
                    />
                    <FieldError message={fieldErrors.address} />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.city} />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.state} />
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        placeholder="6 digits"
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.zipCode} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Government IDs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="aadharNumber">Aadhar Number</Label>
                      <Input
                        id="aadharNumber"
                        name="aadharNumber"
                        value={formData.aadharNumber}
                        onChange={handleChange}
                        placeholder="12 digits"
                      />
                      <FieldError message={fieldErrors.aadharNumber} />
                    </div>
                    <div>
                      <Label htmlFor="panNumber">PAN Number</Label>
                      <Input
                        id="panNumber"
                        name="panNumber"
                        value={formData.panNumber}
                        onChange={handleChange}
                        placeholder="e.g., AAAPB1234K"
                      />
                      <FieldError message={fieldErrors.panNumber} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Employment Info Tab */}
            <TabsContent value="employment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employeeId">Employee ID *</Label>
                      <Input
                        id="employeeId"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                        placeholder="e.g., EMP001"
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.employeeId} />
                    </div>
                    <div>
                      <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                      <Input
                        id="dateOfJoining"
                        name="dateOfJoining"
                        type="date"
                        value={formData.dateOfJoining}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.dateOfJoining} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="designation">Designation *</Label>
                      <Input
                        id="designation"
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                      <FieldError message={fieldErrors.designation} />
                    </div>
                    <div>
                      <Label htmlFor="department">Department *</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) => handleSelectChange("department", value)}
                        disabled={isViewMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Management">Management</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError message={fieldErrors.department} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="employmentType">Employment Type *</Label>
                    <Select
                      value={formData.employmentType}
                      onValueChange={(value) => handleSelectChange("employmentType", value)}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Part-Time">Part-Time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.employmentType} />
                  </div>

                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleSelectChange("status", value as "Active" | "Inactive" | "On Leave" | "Terminated")}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                        <SelectItem value="Terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError message={fieldErrors.status} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Salary Tab */}
            <TabsContent value="salary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Salary Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="baseSalary">Base Salary *</Label>
                    <Input
                      id="baseSalary"
                      name="baseSalary"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.baseSalary}
                      onChange={handleChange}
                      disabled={isViewMode}
                    />
                    <FieldError message={fieldErrors.baseSalary} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Emergency Contact Tab */}
            <TabsContent value="emergency" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="emergencyContactName">Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emergencyContactPhone">Phone</Label>
                      <Input
                        id="emergencyContactPhone"
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleChange}
                        placeholder="10 digit number"
                      />
                      <FieldError message={fieldErrors.emergencyContactPhone} />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactRelation">Relation</Label>
                      <Input
                        id="emergencyContactRelation"
                        name="emergencyContactRelation"
                        value={formData.emergencyContactRelation}
                        onChange={handleChange}
                      />
                      <FieldError message={fieldErrors.emergencyContactRelation} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleChange}
                    />
                      <FieldError message={fieldErrors.bankAccountNumber} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                      />
                      <FieldError message={fieldErrors.bankName} />
                    </div>
                    <div>
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onChange={handleChange}
                      />
                      <FieldError message={fieldErrors.ifscCode} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || isViewMode}
            >
              {mutation.isPending
                ? isViewMode
                  ? "Close"
                  : isEditMode
                    ? "Updating..."
                    : "Creating..."
                : isViewMode
                  ? "Close"
                  : isEditMode
                    ? "Update Employee"
                    : "Create Employee"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}