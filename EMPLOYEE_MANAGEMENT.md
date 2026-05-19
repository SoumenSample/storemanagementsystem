# Employee Management System Documentation

## Overview

A comprehensive Employee Management System has been implemented for your store management application. This system enables you to manage staff profiles, track attendance, handle shift management, manage salaries and payroll, and generate performance reports.

## Features Implemented

### 1. Staff Profiles Management
- Create, read, update, and delete employee records
- Store comprehensive employee information:
  - Personal details (name, email, phone, date of birth, gender)
  - Address information (city, state, ZIP code)
  - Government identification (Aadhar, PAN numbers)
  - Bank account details for salary transfers
  - Employment information (designation, department, employee ID)
  - Emergency contact information
  - Salary structure (base salary, allowances, deductions)
  - Reporting manager hierarchy

**API Endpoints:**
- `GET /api/employees` - List all employees (with pagination, search, filters)
- `POST /api/employees` - Create new employee
- `GET /api/employees/[employeeId]` - Get employee details
- `PUT /api/employees/[employeeId]` - Update employee information
- `DELETE /api/employees/[employeeId]` - Delete employee (soft delete)

**UI Page:** `/employees`

### 2. Attendance Management
- Track daily attendance records for all employees
- Record attendance status (Present, Absent, Half Day, Sick Leave, Casual Leave, On Leave)
- Track check-in and check-out times
- Calculate hours worked
- View attendance history with date range filters

**API Endpoints:**
- `GET /api/attendance` - List attendance records (with filters and pagination)
- `POST /api/attendance` - Mark attendance for an employee

**UI Page:** `/employees/attendance`

### 3. Shift Management
- Create and manage work shifts
- Define shift timings (start time, end time, duration)
- Assign employees to specific shifts
- Mark shifts as active or inactive
- Track which employees are on which shifts

**API Endpoints:**
- `GET /api/shifts` - List all shifts (with search and pagination)
- `POST /api/shifts` - Create new shift

**UI Page:** `/employees/shifts`

### 4. Salary & Payroll Management
- Generate monthly salary records for employees
- Track salary components:
  - Base salary
  - Allowances (dearness, house rent, medical, other)
  - Deductions (provident fund, tax, insurance, other)
  - Net salary calculation
- Track working days, present days, and leave days
- Manage salary status (Draft → Approved → Processed → Paid)
- Record payment dates

**API Endpoints:**
- `GET /api/salary` - List salary records (with filters and pagination)
- `POST /api/salary` - Create salary record for employee and month

**UI Page:** `/employees/salary`

### 5. Performance Reviews & Reports
- Create performance review records
- Rate employees on overall performance (1-5 star scale)
- Create detailed review categories with ratings
- Document strengths and areas for improvement
- Set performance goals
- Track salary adjustments based on performance
- Flag employees eligible for promotion
- Manage review status (Draft → Submitted → Reviewed → Finalized)

**API Endpoints:**
- `GET /api/performance` - List performance reviews (with filters and pagination)
- `POST /api/performance` - Create performance review

**UI Page:** `/employees/performance`

## Database Models

### Employee Model
```typescript
{
  businessId: String (required, indexed)
  firstName: String
  lastName: String
  email: String (unique per business)
  phone: String
  dateOfBirth: Date
  gender: "Male" | "Female" | "Other"
  address: String
  city: String
  state: String
  zipCode: String
  aadharNumber: String
  panNumber: String
  bankAccountNumber: String
  bankName: String
  ifscCode: String
  designation: String
  department: String
  employeeId: String (unique per business)
  dateOfJoining: Date
  employmentType: "Full-Time" | "Part-Time" | "Contract" | "Intern"
  status: "Active" | "Inactive" | "On Leave" | "Terminated"
  baseSalary: Number
  allowances: { dearness, houseRent, medical, other }
  deductions: { providentFund, tax, insurance, other }
  emergencyContactName: String
  emergencyContactPhone: String
  emergencyContactRelation: String
  reportingManagerId: ObjectId (self-reference)
  profileImage: String (URL)
  isDeleted: Boolean
  timestamps: { createdAt, updatedAt }
}
```

### Attendance Model
```typescript
{
  businessId: String (required, indexed)
  employeeId: ObjectId (ref: Employee)
  date: Date
  status: "Present" | "Absent" | "Half Day" | "Sick Leave" | "Casual Leave" | "On Leave"
  checkInTime: String (HH:MM format)
  checkOutTime: String (HH:MM format)
  hoursWorked: Number
  notes: String
  isDeleted: Boolean
  timestamps: { createdAt, updatedAt }
  // Unique index on (businessId, employeeId, date)
}
```

### Shift Model
```typescript
{
  businessId: String (required, indexed)
  shiftName: String
  startTime: String (HH:MM format)
  endTime: String (HH:MM format)
  duration: Number (hours)
  description: String
  isActive: Boolean
  employees: [ObjectId] (ref: Employee)
  isDeleted: Boolean
  timestamps: { createdAt, updatedAt }
  // Unique index on (businessId, shiftName)
}
```

### Salary Model
```typescript
{
  businessId: String (required, indexed)
  employeeId: ObjectId (ref: Employee)
  month: Number (1-12)
  year: Number
  baseSalary: Number
  allowances: { dearness, houseRent, medical, other }
  deductions: { providentFund, tax, insurance, other }
  totalAllowances: Number
  totalDeductions: Number
  netSalary: Number
  workingDays: Number
  presentDays: Number
  leaveDays: Number
  status: "Draft" | "Approved" | "Processed" | "Paid"
  paidDate: Date
  notes: String
  isDeleted: Boolean
  timestamps: { createdAt, updatedAt }
  // Unique index on (businessId, employeeId, month, year)
}
```

### Performance Model
```typescript
{
  businessId: String (required, indexed)
  employeeId: ObjectId (ref: Employee)
  reviewPeriodStart: Date
  reviewPeriodEnd: Date
  reviewedBy: ObjectId (ref: Employee)
  overallRating: Number (1-5)
  categories: [
    {
      category: String
      rating: Number (1-5)
      comments: String
    }
  ]
  strengths: String
  areasForImprovement: String
  goals: String
  salary_adjustment: Number (percentage)
  promotionEligible: Boolean
  status: "Draft" | "Submitted" | "Reviewed" | "Finalized"
  reviewNotes: String
  isDeleted: Boolean
  timestamps: { createdAt, updatedAt }
}
```

## Validation Schemas

All API inputs are validated using Zod schemas defined in `src/schemas/employee.ts`:

- `createEmployeeSchema` - Validates employee creation
- `updateEmployeeSchema` - Partial schema for employee updates
- `attendanceSchema` - Validates attendance records
- `shiftSchema` - Validates shift creation
- `salarySchema` - Validates salary records
- `performanceSchema` - Validates performance reviews

## UI Components

### EmployeeList (`src/components/employees/EmployeeList.tsx`)
- Displays all employees in a data table
- Search by name, email, or employee ID
- Filter by department and status
- Pagination support
- Actions: View, Edit, Delete

### AttendanceList (`src/components/employees/AttendanceList.tsx`)
- Displays attendance records in a table
- Date range filtering
- Shows attendance status with color coding
- Check-in/out times and hours worked

### ShiftList (`src/components/employees/ShiftList.tsx`)
- Lists all shifts with timings
- Shows number of employees per shift
- Active/inactive status
- Search functionality

### SalaryList (`src/components/employees/SalaryList.tsx`)
- Monthly salary records with employee details
- Filter by month, year, and status
- Shows salary components (base, allowances, deductions, net)
- View and download options

### PerformanceList (`src/components/employees/PerformanceList.tsx`)
- Performance review records
- Overall rating display with color coding
- Filter by review status
- Promotion eligibility indicator
- Review period information

## Navigation

A new "Employees" menu item has been added to the sidebar with the following sub-sections:
- Staff Management → `/employees`
- Attendance → `/employees/attendance`
- Shifts → `/employees/shifts`
- Salary → `/employees/salary`
- Performance → `/employees/performance`

## File Structure

```
src/
├── models/
│   ├── employee.ts
│   ├── attendance.ts
│   ├── shift.ts
│   ├── salary.ts
│   └── performance.ts
├── schemas/
│   └── employee.ts
├── app/
│   └── (dashboard)/
│       └── employees/
│           ├── page.tsx
│           ├── loading.tsx
│           ├── attendance/
│           │   ├── page.tsx
│           │   └── loading.tsx
│           ├── shifts/
│           │   ├── page.tsx
│           │   └── loading.tsx
│           ├── salary/
│           │   ├── page.tsx
│           │   └── loading.tsx
│           └── performance/
│               ├── page.tsx
│               └── loading.tsx
├── api/
│   ├── employees/
│   │   ├── route.ts
│   │   └── [employeeId]/route.ts
│   ├── attendance/route.ts
│   ├── shifts/route.ts
│   ├── salary/route.ts
│   └── performance/route.ts
└── components/
    └── employees/
        ├── EmployeeList.tsx
        ├── AttendanceList.tsx
        ├── ShiftList.tsx
        ├── SalaryList.tsx
        └── PerformanceList.tsx
```

## Key Features

### Security & Authorization
- All endpoints require authentication via `auth()` session
- Business ID isolation - users can only access their own business data
- Soft deletes for data integrity

### Performance & Optimization
- Pagination support (default 20 items per page, max 100)
- MongoDB indexing on frequently queried fields
- Lean queries for improved performance
- Population of referenced documents only when needed

### Error Handling
- Input validation using Zod schemas
- Rate limiting on mutations (30 requests per 60 seconds)
- Proper HTTP status codes and error messages
- Try-catch blocks with detailed error logging

### Scalability
- Indexed fields for fast queries
- Proper database relationships using refs
- Partitioned data by business ID
- Skeleton loading states for better UX

## How to Use

### Creating an Employee
1. Navigate to `/employees`
2. Click "Add Employee"
3. Fill in all required employee details
4. Save the employee

### Marking Attendance
1. Go to `/employees/attendance`
2. Click "Mark Attendance"
3. Select employee, date, and status
4. Save the attendance record

### Managing Shifts
1. Navigate to `/employees/shifts`
2. Click "Create Shift"
3. Define shift timings and assign employees
4. Save the shift

### Generating Salary
1. Go to `/employees/salary`
2. Click "Generate Salary"
3. Select employee and month/year
4. Review and approve salary details

### Creating Performance Reviews
1. Navigate to `/employees/performance`
2. Click "Create Review"
3. Rate employee across categories
4. Add feedback and goals
5. Submit for review

## Future Enhancements

Possible features to add:
- Bulk import/export of employee data
- Leave request management
- Payroll reports and analytics
- Employee self-service portal
- Integration with attendance devices
- Tax calculations based on Indian tax rules
- Email notifications for salary processing
- Performance history analytics
- Promotion management workflow
- Employee training and development tracking

## API Response Examples

### Employee List Response
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "employeeId": "EMP001",
      "designation": "Sales Manager",
      "department": "Sales",
      "status": "Active"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 50,
  "totalPages": 3
}
```

### Salary Record Response
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "employeeId": {
        "_id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "month": 5,
      "year": 2024,
      "baseSalary": 50000,
      "totalAllowances": 10000,
      "totalDeductions": 5000,
      "netSalary": 55000,
      "status": "Paid",
      "paidDate": "2024-05-01"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 12,
  "totalPages": 1
}
```

## Notes

- All timestamps are stored in UTC
- Business ID is automatically added from the authenticated session
- Soft deletes are used to maintain data integrity
- All employee IDs must be unique within a business
- Email addresses must be unique within a business
- Dates follow ISO 8601 format
- Times are stored in 24-hour HH:MM format
