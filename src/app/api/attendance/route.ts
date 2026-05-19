import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { AttendanceModel } from "@/models/attendance";
import { attendanceSchema } from "@/schemas/employee";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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

  const { page, pageSize, employeeId, startDate, endDate, status } = parsed.data;
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

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      (filter.date as any).$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (filter.date as any).$lte = end;
    }
  }

  await connectToDatabase();

  const [items, total] = await Promise.all([
    AttendanceModel.find(filter)
      .populate("employeeId", "firstName lastName employeeId")
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    AttendanceModel.countDocuments(filter),
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
    const limiter = rateLimit(`attendance:create:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if attendance record already exists
    const existingAttendance = await AttendanceModel.findOne({
      businessId: session.user.businessId,
      employeeId: new ObjectId(parsed.data.employeeId),
      date: {
        $gte: new Date(parsed.data.date.toDateString()),
        $lt: new Date(new Date(parsed.data.date).getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Attendance already recorded for this date" },
        { status: 409 }
      );
    }

    const attendance = new AttendanceModel({
      ...parsed.data,
      businessId: session.user.businessId,
      employeeId: new ObjectId(parsed.data.employeeId),
    });

    await attendance.save();
    await attendance.populate("employeeId", "firstName lastName employeeId");

    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error("Error creating attendance record:", error);
    return NextResponse.json(
      { error: "Failed to create attendance record" },
      { status: 500 }
    );
  }
}
