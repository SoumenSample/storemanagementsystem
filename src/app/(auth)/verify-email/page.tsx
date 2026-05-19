"use client";

import { Suspense } from "react";
import VerifyEmailContent from "./verify-email-content";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6"><p>Loading...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
