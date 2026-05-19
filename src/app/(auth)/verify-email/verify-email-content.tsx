"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verify = async () => {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setStatus("success");
        setMessage("Email verified. You can now log in.");
        return;
      }

      const data = await response.json();
      setStatus("error");
      setMessage(data.error ?? "Verification failed.");
    };

    void verify();
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Verify email</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {status === "loading"
          ? "Checking your verification token..."
          : message}
      </p>
      {status === "success" && (
        <a
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800"
          href="/login"
        >
          Continue to login
        </a>
      )}
    </div>
  );
}
