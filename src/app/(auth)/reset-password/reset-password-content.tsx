"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Reset token is missing.");
    }
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("Password reset successful. You can now log in.");
        return;
      }

      const data = await res.json();
      setStatus("error");
      setMessage(data.error ?? "Reset failed.");
    } catch (err) {
      setStatus("error");
      setMessage("Network error");
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Reset password</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {status === "loading" ? "Resetting password..." : "Enter a new password."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          className="rounded-md border px-3 py-2"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
        />

        <input
          className="rounded-md border px-3 py-2"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          required
        />

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Resetting..." : "Reset password"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      )}
    </div>
  );
}
