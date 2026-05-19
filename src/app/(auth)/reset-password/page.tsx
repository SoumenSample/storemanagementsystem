"use client";

import { Suspense } from "react";
import ResetPasswordContent from "./reset-password-content";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6"><p>Loading...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
