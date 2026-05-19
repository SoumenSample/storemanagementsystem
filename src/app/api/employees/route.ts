import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessMemberModel } from "@/models/businessMember";
import { EmployeeModel } from "@/models/employee";
import { UserModel } from "@/models/user";
import { createEmployeeSchema } from "@/schemas/employee";
import { rateLimit } from "@/lib/rate-limit";
import { ensureEmployeeAccess, type EmployeeBusinessRole } from "@/lib/employee-access";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
});

const createEmployeeBodySchema = createEmployeeSchema.extend({
  businessRole: z.enum(["CASHIER", "INVENTORY_MANAGER"]).optional(),
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

  const { page, pageSize, search, status, department } = parsed.data;
  const filter: Record<string, unknown> = {
    businessId: session.user.businessId,
    isDeleted: false,
  };

  if (status) {
    filter.status = status;
  }

  if (department) {
    filter.department = department;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
    ];
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    EmployeeModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    EmployeeModel.countDocuments(filter),
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
  let accessResult: Awaited<ReturnType<typeof ensureEmployeeAccess>> | null = null;
  let businessId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    businessId = session.user.businessId;

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`employee:create:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = createEmployeeBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const businessRole = parsed.data.businessRole as EmployeeBusinessRole | undefined;

    const [existingEmployeeId, existingEmail] = await Promise.all([
      EmployeeModel.findOne({
        businessId: session.user.businessId,
        employeeId: parsed.data.employeeId,
      }).lean(),
      EmployeeModel.findOne({
        businessId: session.user.businessId,
        email: parsed.data.email as string,
      }).lean(),
    ]);

    if (existingEmployeeId) {
      return NextResponse.json(
        { error: "Employee ID already exists", field: "employeeId" },
        { status: 409 }
      );
    }

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists", field: "email" },
        { status: 409 }
      );
    }

    if (businessRole) {
      accessResult = await ensureEmployeeAccess({
        businessId: session.user.businessId,
        name: `${parsed.data.firstName as string} ${parsed.data.lastName as string}`,
        email: parsed.data.email as string,
        phone: parsed.data.phone as string,
        role: businessRole,
      });
    }

    const employee = new EmployeeModel({
      ...parsed.data,
      businessId: session.user.businessId,
      userId: accessResult?.userId ?? null,
      businessRole: businessRole ?? null,
      aadharNumber: parsed.data.aadharNumber || null,
      panNumber: parsed.data.panNumber || null,
      bankAccountNumber: parsed.data.bankAccountNumber || null,
      bankName: parsed.data.bankName || null,
      ifscCode: parsed.data.ifscCode || null,
      reportingManagerId: parsed.data.reportingManagerId || null,
      profileImage: parsed.data.profileImage || null,
      emergencyContactName: parsed.data.emergencyContactName || null,
      emergencyContactPhone: parsed.data.emergencyContactPhone || null,
      emergencyContactRelation: parsed.data.emergencyContactRelation || null,
      allowances: parsed.data.allowances || {
        dearness: 0,
        houseRent: 0,
        medical: 0,
        other: 0,
      },
      deductions: parsed.data.deductions || {
        providentFund: 0,
        tax: 0,
        insurance: 0,
        other: 0,
      },
    });

    await employee.save();

    const response = employee.toObject();
    return NextResponse.json(
      {
        ...response,
        businessRole: response.businessRole ?? businessRole ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating employee:", error);

    if (accessResult?.userId && businessId) {
      await connectToDatabase();
      await BusinessMemberModel.deleteOne({
        businessId,
        userId: accessResult.userId,
      });

      if (accessResult.createdUser) {
        await UserModel.deleteOne({ _id: accessResult.userId });
      }
    }

    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      const duplicateFields = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern || {});
      const duplicateField = duplicateFields.includes("email")
        ? "email"
        : duplicateFields.includes("employeeId")
          ? "employeeId"
          : duplicateFields[0] || "unknown";

      return NextResponse.json(
        {
          error:
            duplicateField === "email"
              ? "Email already exists"
              : duplicateField === "employeeId"
                ? "Employee ID already exists"
                : "Duplicate employee record",
          field: duplicateField,
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Invalid employee data", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
