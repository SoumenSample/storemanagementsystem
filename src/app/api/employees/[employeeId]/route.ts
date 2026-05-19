import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { BusinessMemberModel } from "@/models/businessMember";
import { EmployeeModel } from "@/models/employee";
import { UserModel } from "@/models/user";
import { updateEmployeeSchema } from "@/schemas/employee";
import { rateLimit } from "@/lib/rate-limit";
import { ensureEmployeeAccess, type EmployeeBusinessRole } from "@/lib/employee-access";
import { ObjectId } from "mongodb";
import { z } from "zod";

const updateEmployeeBodySchema = updateEmployeeSchema.extend({
  businessRole: z.enum(["CASHIER", "INVENTORY_MANAGER"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { employeeId } = await params;

  if (!ObjectId.isValid(employeeId)) {
    return NextResponse.json(
      { error: "Invalid employee ID" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const employee = await EmployeeModel.findOne({
    _id: new ObjectId(employeeId),
    businessId: session.user.businessId,
    isDeleted: false,
  }).lean();

  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    );
  }

  const membership = await (async () => {
    if (employee.userId) {
      const linkedMembership = await BusinessMemberModel.findOne({
        businessId: session.user.businessId,
        userId: employee.userId,
        isDeleted: { $ne: true },
      }).lean();

      if (linkedMembership) {
        return linkedMembership;
      }
    }

    const user = await UserModel.findOne({
      email: String(employee.email).toLowerCase(),
    }).lean();

    if (!user) {
      return null;
    }

    return BusinessMemberModel.findOne({
      businessId: session.user.businessId,
      userId: user._id,
      isDeleted: { $ne: true },
    }).lean();
  })();

  return NextResponse.json({
    ...employee,
    businessRole: membership?.role ?? employee.businessRole ?? null,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { employeeId } = await params;

    if (!ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`employee:update:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = updateEmployeeBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const objectId = new ObjectId(employeeId);
    const currentEmployee = await EmployeeModel.findOne({
      _id: objectId,
      businessId: session.user.businessId,
      isDeleted: false,
    }).lean();

    if (!currentEmployee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const businessRole = parsed.data.businessRole as EmployeeBusinessRole | undefined;
    const updateData = { ...parsed.data } as Record<string, unknown>;
    delete updateData.businessRole;

    const normalizedUpdateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value === undefined) {
        continue;
      }

      if (
        [
          "aadharNumber",
          "panNumber",
          "bankAccountNumber",
          "bankName",
          "ifscCode",
          "emergencyContactName",
          "emergencyContactPhone",
          "emergencyContactRelation",
          "reportingManagerId",
          "profileImage",
        ].includes(key) &&
        value === ""
      ) {
        normalizedUpdateData[key] = null;
        continue;
      }

      normalizedUpdateData[key] = value;
    }

    const normalizedEmail = typeof normalizedUpdateData.email === "string"
      ? normalizedUpdateData.email.toLowerCase()
      : currentEmployee.email;

    // Check for duplicate email if email is being updated
    if (normalizedUpdateData.email && normalizedEmail !== currentEmployee.email) {
      const existingEmail = await EmployeeModel.findOne({
        businessId: session.user.businessId,
        email: normalizedEmail,
        _id: { $ne: objectId },
        isDeleted: false,
      }).lean();

      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already exists", field: "email" },
          { status: 409 }
        );
      }
    }

    if (currentEmployee.userId && normalizedEmail !== currentEmployee.email) {
      const existingUser = await UserModel.findOne({
        email: normalizedEmail,
        _id: { $ne: currentEmployee.userId },
      }).lean();

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists", field: "email" },
          { status: 409 }
        );
      }
    }

    // Check for duplicate employeeId if it's being updated
    if (normalizedUpdateData.employeeId && normalizedUpdateData.employeeId !== currentEmployee.employeeId) {
      const existingEmployeeId = await EmployeeModel.findOne({
        businessId: session.user.businessId,
        employeeId: normalizedUpdateData.employeeId,
        _id: { $ne: objectId },
        isDeleted: false,
      }).lean();

      if (existingEmployeeId) {
        return NextResponse.json(
          { error: "Employee ID already exists", field: "employeeId" },
          { status: 409 }
        );
      }
    }

    let linkedUserId = currentEmployee.userId ? currentEmployee.userId.toString() : null;

    if (businessRole) {
      const accessResult = await ensureEmployeeAccess({
        businessId: session.user.businessId,
        name: `${parsed.data.firstName ?? currentEmployee.firstName} ${parsed.data.lastName ?? currentEmployee.lastName}`,
        email: normalizedEmail,
        phone: (parsed.data.phone ?? currentEmployee.phone) as string,
        role: businessRole,
        existingUserId: linkedUserId,
      });

      linkedUserId = accessResult.userId;
      normalizedUpdateData.userId = accessResult.userId;
      normalizedUpdateData.businessRole = businessRole;
    }

    const employee = await EmployeeModel.findOneAndUpdate(
      {
        _id: objectId,
        businessId: session.user.businessId,
        isDeleted: false,
      },
      { $set: { ...normalizedUpdateData, ...(linkedUserId ? { userId: linkedUserId } : {}) } },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (linkedUserId && !businessRole) {
      await UserModel.updateOne(
        { _id: linkedUserId },
        {
          $set: {
            name: `${employee.firstName} ${employee.lastName}`,
            email: employee.email.toLowerCase(),
            phone: employee.phone,
            isActive: true,
            emailVerifiedAt: new Date(),
          },
        }
      );
    }

    const membership = linkedUserId
      ? await BusinessMemberModel.findOne({
          businessId: session.user.businessId,
          userId: linkedUserId,
          isDeleted: { $ne: true },
        }).lean()
      : null;

    return NextResponse.json({
      ...employee.toObject(),
      businessRole: membership?.role ?? employee.businessRole ?? businessRole ?? currentEmployee.businessRole ?? null,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { employeeId } = await params;

    if (!ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { error: "Invalid employee ID" },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const limiter = rateLimit(`employee:delete:${ip}`, 30, 60_000);
    if (!limiter.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    await connectToDatabase();

    const employee = await EmployeeModel.findOne({
      _id: new ObjectId(employeeId),
      businessId: session.user.businessId,
      isDeleted: false,
    }).lean();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await EmployeeModel.deleteOne({
      _id: new ObjectId(employeeId),
      businessId: session.user.businessId,
    });

    if (employee.userId) {
      await BusinessMemberModel.deleteOne(
        {
          businessId: session.user.businessId,
          userId: employee.userId,
        },
      );

      const remainingMemberships = await BusinessMemberModel.countDocuments({
        userId: employee.userId,
        isDeleted: { $ne: true },
      });

      if (remainingMemberships === 0) {
        await UserModel.deleteOne({ _id: employee.userId });
      } else {
        await UserModel.updateOne(
          { _id: employee.userId },
          { $set: { isActive: false } }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
