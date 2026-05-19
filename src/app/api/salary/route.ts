import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { SalaryModel } from "@/models/salary";
import { salarySchema } from "@/schemas/employee";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  month: z.coerce.number().optional(),
  year: z.coerce.number().optional(),
  status: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query" },
      { status: 400 }
    );
  }

  const { page, pageSize, employeeId, month, year, status } = parsed.data;
  const filter: Record<string, unknown> = {
    businessId: session.user.businessId,
    isDeleted: false,
  };

  if (employeeId && ObjectId.isValid(employeeId)) {
    filter.employeeId = new ObjectId(employeeId);
  }

  if (month) {
    filter.month = month;
  }

  if (year) {
    filter.year = year;
  }

  if (status) {
    filter.status = status;
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    SalaryModel.find(filter)
      .populate("employeeId", "firstName lastName employeeId email")
      .sort({ year: -1, month: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    SalaryModel.countDocuments(filter),
  ]);

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`salary:create:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = salarySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if salary record already exists
    const existingSalary = await SalaryModel.findOne({
      businessId: session.user.businessId,
      employeeId: new ObjectId(parsed.data.employeeId),
      month: parsed.data.month,
      year: parsed.data.year,
    });

    if (existingSalary) {
      return NextResponse.json(
        { error: "Salary record already exists for this month" },
        { status: 409 }
      );
    }

    const allowances = parsed.data.allowances || {
      dearness: 0,
      houseRent: 0,
      medical: 0,
      other: 0,
    };

    const deductions = parsed.data.deductions || {
      providentFund: 0,
      tax: 0,
      insurance: 0,
      other: 0,
    };

    const totalAllowances = Object.values(allowances).reduce((a, b) => a + b, 0);
    const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
    const netSalary = parsed.data.baseSalary + totalAllowances - totalDeductions;

    const salary = new SalaryModel({
      ...parsed.data,
      businessId: session.user.businessId,
      employeeId: new ObjectId(parsed.data.employeeId),
      allowances,
      deductions,
      totalAllowances,
      totalDeductions,
      netSalary,
    });

    await salary.save();
    await salary.populate("employeeId", "firstName lastName employeeId email");

    return NextResponse.json(salary, { status: 201 });
  } catch (error) {
    console.error("Error creating salary record:", error);
    return NextResponse.json(
      { error: "Failed to create salary record" },
      { status: 500 }
    );
  }
}
