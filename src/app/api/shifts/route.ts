import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ShiftModel } from "@/models/shift";
import { shiftSchema } from "@/schemas/employee";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.string().optional(),
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

  const { page, pageSize, search, isActive } = parsed.data;
  const filter: Record<string, unknown> = {
    businessId: session.user.businessId,
    isDeleted: false,
  };

  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === "1";
  }

  if (search) {
    filter.shiftName = { $regex: search, $options: "i" };
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    ShiftModel.find(filter)
      .populate("employees", "firstName lastName employeeId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ShiftModel.countDocuments(filter),
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
    const limiter = rateLimit(`shift:create:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = shiftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if shift already exists
    const existingShift = await ShiftModel.findOne({
      businessId: session.user.businessId,
      shiftName: parsed.data.shiftName,
    });

    if (existingShift) {
      return NextResponse.json(
        { error: "Shift with this name already exists" },
        { status: 409 }
      );
    }

    const employees = parsed.data.employees
      ? parsed.data.employees.map((id) => new ObjectId(id))
      : [];

    const shift = new ShiftModel({
      ...parsed.data,
      businessId: session.user.businessId,
      employees,
    });

    await shift.save();
    await shift.populate("employees", "firstName lastName employeeId");

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
