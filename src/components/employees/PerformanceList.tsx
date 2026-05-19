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
import { Plus, Eye, Edit2 } from "lucide-react";

type Performance = {
  _id: string;
  employeeId: {
    firstName: string;
    lastName: string;
    employeeId: string;
    email: string;
  };
  reviewedBy: {
    firstName: string;
    lastName: string;
  };
  overallRating: number;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  status: string;
  promotionEligible: boolean;
};

type PerformanceResponse = {
  items: Performance[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function PerformanceList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery<PerformanceResponse>({
    queryKey: ["performance", page, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
        ...(status && { status }),
      });
      const response = await fetch(`/api/performance?${params}`);
      if (!response.ok) throw new Error("Failed to fetch performance reviews");
      return response.json();
    },
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "bg-green-100 text-green-800";
    if (rating >= 3.5) return "bg-blue-100 text-blue-800";
    if (rating >= 2.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <>
      <SiteHeader />
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Performance Management</h2>
            <p className="text-muted-foreground">Track and manage employee performance reviews</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Review
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={status || "default"} onValueChange={(value) => {
              setStatus(value === "default" ? "" : value);
              setPage(1);
            }}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Reviewed">Reviewed</SelectItem>
                <SelectItem value="Finalized">Finalized</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead>Review Period</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Promotion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-6 w-24" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-destructive py-4">
                        Error loading performance reviews
                      </TableCell>
                    </TableRow>
                  ) : data?.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                        No performance reviews found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.items.map((review) => (
                      <TableRow key={review._id}>
                        <TableCell className="font-medium">{review.employeeId.employeeId}</TableCell>
                        <TableCell>{`${review.employeeId.firstName} ${review.employeeId.lastName}`}</TableCell>
                        <TableCell>
                          {`${new Date(review.reviewPeriodStart).toLocaleDateString()} - ${new Date(review.reviewPeriodEnd).toLocaleDateString()}`}
                        </TableCell>
                        <TableCell>
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRatingColor(review.overallRating)}`}>
                            {review.overallRating.toFixed(1)} / 5
                          </span>
                        </TableCell>
                        <TableCell>{`${review.reviewedBy.firstName} ${review.reviewedBy.lastName}`}</TableCell>
                        <TableCell>
                          {review.promotionEligible ? (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                              Eligible
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                              Not Eligible
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            review.status === "Finalized"
                              ? "bg-green-100 text-green-800"
                              : review.status === "Reviewed"
                              ? "bg-blue-100 text-blue-800"
                              : review.status === "Submitted"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {review.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
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
