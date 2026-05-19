"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download, Eye } from "lucide-react";

type Salary = {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
  };
  month: number;
  year: number;
  baseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  paidDate?: string;
};

type SalaryResponse = {
  items: Salary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function SalaryList() {
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery<SalaryResponse>({
    queryKey: ["salary", page, month, year, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        ...(month && { month }),
        ...(year && { year }),
        ...(status && { status }),
      });
      const response = await fetch(`/api/salary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch salary records");
      return response.json();
    },
  });

  return (
    <>
      <SiteHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Salary Management</h2>
            <p className="text-muted-foreground">Manage employee salaries and payroll</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Generate Salary
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={month || "default"} onValueChange={(value) => {
                setMonth(value === "default" ? "" : value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">All Months</SelectItem>
                  {monthNames.map((m, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year || "default"} onValueChange={(value) => {
                setYear(value === "default" ? "" : value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">All Years</SelectItem>
                  {Array.from({ length: 10 }).map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={status || "default"} onValueChange={(value) => {
                setStatus(value === "default" ? "" : value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Processed">Processed</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-6 w-24" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-destructive py-4">
                        Error loading salary records
                      </TableCell>
                    </TableRow>
                  ) : data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                        No salary records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">{record.employeeId.employeeId}</TableCell>
                        <TableCell>{`${record.employeeId.firstName} ${record.employeeId.lastName}`}</TableCell>
                        <TableCell>{`${monthNames[record.month - 1]} ${record.year}`}</TableCell>
                        <TableCell>₹{record.baseSalary.toLocaleString()}</TableCell>
                        <TableCell>₹{record.totalAllowances.toLocaleString()}</TableCell>
                        <TableCell>₹{record.totalDeductions.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">₹{record.netSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : record.status === "Approved"
                              ? "bg-blue-100 text-blue-800"
                              : record.status === "Processed"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {record.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={page === data.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
