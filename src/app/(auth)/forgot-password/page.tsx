"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("sent");
        setMessage(
          "If an account with that email exists, a reset link has been sent."
        );
        return;
      }

      const data = await res.json();
      setStatus("error");
      setMessage(data.error ?? "Something went wrong.");
    } catch (err) {
      setStatus("error");
      setMessage("Network error");
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Forgot password</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Enter your email and we'll send a link to reset your password.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          className="rounded-md border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{message}</p>
      )}
    </div>
  );
}
