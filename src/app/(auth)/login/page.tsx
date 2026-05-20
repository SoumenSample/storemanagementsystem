"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/schemas/auth";
import type { z } from "zod";
import { signIn } from "next-auth/react";
import Link from "next/link";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const onSubmit = async (values: LoginForm) => {
    setMessage(null);

    try {
      const response = await signIn("credentials", {
        email: values.email,
        password: values.password,
        remember: values.remember ? "true" : "false",
        redirect: false,
      });

      if (response?.error) {
        setMessage("Invalid login. Please check your credentials.");
        return;
      }

      if (!response?.ok) {
        setMessage("Login failed. Please try again.");
        return;
      }

      window.location.assign("/dashboard");
    } catch (error) {
      setMessage("An error occurred. Please try again.");
      console.error("Sign in error:", error);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Use your verified account to continue onboarding.
      </p>

      <form
        className="mt-6 grid gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
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
          <label className="text-sm font-medium">Password</label>
          <input
            className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-white"
            type="password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <span className="text-xs text-red-600">
              {form.formState.errors.password.message}
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            className="h-4 w-4"
            {...form.register("remember")}
          />
          Remember me
        </label>
        <button
          className="mt-2 h-11 rounded-full bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Link href="/forgot-password" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">
            Forgot password?
          </Link>
        </div>
      </form>

      {message && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}
    </div>
  );
}
