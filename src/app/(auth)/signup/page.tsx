"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/schemas/auth";
import type { z } from "zod";

type RegisterForm = z.infer<typeof registerSchema>;

export default function SignupPage() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });

  const onSubmit = async (values: RegisterForm) => {
    setStatus("idle");
    setMessage(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      setStatus("success");
      setMessage(
        "Check your inbox for a verification link. You can log in after verification."
      );
      form.reset();
      return;
    }

    const data = await response.json();
    setStatus("error");
    setMessage(data.error ?? "Something went wrong. Please try again.");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        For business owners and admins only. Step 1: create your user account to start the onboarding flow.
      </p>

      <form
        className="mt-6 grid gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-2">
          <label className="text-sm font-medium">Full name</label>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-white"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <span className="text-xs text-red-600">
              {form.formState.errors.name.message}
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Email</label>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-white"
            type="email"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <span className="text-xs text-red-600">
              {form.formState.errors.email.message}
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Phone</label>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-white"
            {...form.register("phone")}
          />
          {form.formState.errors.phone && (
            <span className="text-xs text-red-600">
              {form.formState.errors.phone.message}
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">Password</label>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-white"
            type="password"
            {...form.register("password")}
          />
          <span className="text-xs text-zinc-500">
            Must include upper, lower, number, and symbol.
          </span>
          {form.formState.errors.password && (
            <span className="text-xs text-red-600">
              {form.formState.errors.password.message}
            </span>
          )}
        </div>
        <button
          className="mt-2 h-11 rounded-full bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creating..." : "Create account"}
        </button>
      </form>

      {status !== "idle" && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${{
            success: "border-emerald-200 bg-emerald-50 text-emerald-700",
            error: "border-red-200 bg-red-50 text-red-700",
            idle: "",
          }[status]}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
