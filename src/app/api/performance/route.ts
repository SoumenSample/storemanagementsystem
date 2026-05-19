import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { PerformanceModel } from "@/models/performance";
import { performanceSchema } from "@/schemas/employee";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
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

  const { page, pageSize, employeeId, status } = parsed.data;
  const filter: Record<string, unknown> = {
    businessId: session.user.businessId,
    isDeleted: false,
  };

  if (employeeId && ObjectId.isValid(employeeId)) {
    filter.employeeId = new ObjectId(employeeId);
  }

  if (status) {
    filter.status = status;
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    PerformanceModel.find(filter)
      .populate("employeeId", "firstName lastName employeeId email")
      .populate("reviewedBy", "firstName lastName employeeId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    PerformanceModel.countDocuments(filter),
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
    const limiter = rateLimit(`performance:create:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = performanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const performance = new PerformanceModel({
      ...parsed.data,
      businessId: session.user.businessId,
      employeeId: new ObjectId(parsed.data.employeeId),
      reviewedBy: new ObjectId(parsed.data.reviewedBy),
    });

    await performance.save();
    await performance.populate("employeeId", "firstName lastName employeeId email");
    await performance.populate("reviewedBy", "firstName lastName employeeId");

    return NextResponse.json(performance, { status: 201 });
  } catch (error) {
    console.error("Error creating performance review:", error);
    return NextResponse.json(
      { error: "Failed to create performance review" },
      { status: 500 }
    );
  }
}
