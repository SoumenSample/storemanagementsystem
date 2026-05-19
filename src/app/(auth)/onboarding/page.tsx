"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessOnboardingSchema } from "@/schemas/business";
import type { z } from "zod";
import { useState } from "react";
import { INDIA_STATES } from "@/utils/india-states";
import { useRouter } from "next/navigation";

type BusinessForm = z.infer<typeof businessOnboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [upiUploading, setUpiUploading] = useState(false);
  const form = useForm<BusinessForm>({
    resolver: zodResolver(businessOnboardingSchema),
    defaultValues: {
      name: "",
      gstin: "",
      pan: "",
      address: "",
      state: "",
      stateCode: "",
      phone: "",
      email: "",
      website: "",
      invoicePrefix: "INV",
      gstRegistrationType: "REGULAR",
      bankDetails: {
        bankName: "",
        accountNumber: "",
        ifsc: "",
        branch: "",
      },
      logoUrl: "",
      signatureUrl: "",
      upiQrUrl: "",
    },
  });

  const onSubmit = async (values: BusinessForm) => {
    setMessage(null);
    const response = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      router.push("/dashboard");
      return;
    }

    const data = await response.json();
    const issues = data.issues
      ? JSON.stringify(data.issues, null, 2)
      : null;
    setMessage(
      data.error ??
        (issues ? `Unable to complete onboarding: ${issues}` : "Unable to complete onboarding.")
    );
  };

  const uploadFile = async (
    file: File,
    onStart: () => void,
    onDone: () => void,
    onError: () => void
  ) => {
    try {
      onStart();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "gstandbilling/business");
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "Upload failed");
        throw new Error("Upload failed");
      }
      return data.url as string;
    } catch {
      onError();
      return "";
    } finally {
      onDone();
    }
  };

  const onInvalid = () => {
    const errors = form.formState.errors;
    const messages = Object.values(errors)
      .map((error) => (error?.message ? String(error.message) : ""))
      .filter(Boolean);
    setMessage(
      messages.length
        ? `Fix these fields: ${messages.join(", ")}`
        : "Please complete all required fields before continuing."
    );
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Business onboarding
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Step 2: Add your business details to create the tenant workspace.
      </p>

      <form
        className="mt-8 grid gap-6"
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      >
        <section className="grid gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Business profile</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company name</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("name")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">GSTIN</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("gstin")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">PAN</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("pan")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Invoice prefix</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("invoicePrefix")}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Address</label>
            <textarea
              className="min-h-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              {...form.register("address")}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">State</label>
              <select
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("state")}
              >
                <option value="">Select state</option>
                {INDIA_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">State code</label>
              <select
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("stateCode")}
              >
                <option value="">Code</option>
                {INDIA_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">GST registration</label>
              <select
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("gstRegistrationType")}
              >
                <option value="REGULAR">Regular</option>
                <option value="UNREGISTERED">Unregistered</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Business phone</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("phone")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Business email</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("email")}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Website</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("website")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company logo</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await uploadFile(
                    file,
                    () => setLogoUploading(true),
                    () => setLogoUploading(false),
                    () => setMessage("Logo upload failed")
                  );
                  if (url) form.setValue("logoUrl", url);
                }}
              />
              {logoUploading && (
                <span className="text-xs text-zinc-500">Uploading...</span>
              )}
              {form.watch("logoUrl") ? (
                <span className="text-xs text-zinc-500">
                  Uploaded
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Bank details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Bank name</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("bankDetails.bankName")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Account number</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("bankDetails.accountNumber")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">IFSC</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("bankDetails.ifsc")}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Branch</label>
              <input
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...form.register("bankDetails.branch")}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Payment artifacts</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Signature image</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await uploadFile(
                    file,
                    () => setSignatureUploading(true),
                    () => setSignatureUploading(false),
                    () => setMessage("Signature upload failed")
                  );
                  if (url) form.setValue("signatureUrl", url);
                }}
              />
              {signatureUploading && (
                <span className="text-xs text-zinc-500">Uploading...</span>
              )}
              {form.watch("signatureUrl") ? (
                <span className="text-xs text-zinc-500">
                  Uploaded
                </span>
              ) : null}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">UPI QR image</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await uploadFile(
                    file,
                    () => setUpiUploading(true),
                    () => setUpiUploading(false),
                    () => setMessage("UPI QR upload failed")
                  );
                  if (url) form.setValue("upiQrUrl", url);
                }}
              />
              {upiUploading && (
                <span className="text-xs text-zinc-500">Uploading...</span>
              )}
              {form.watch("upiQrUrl") ? (
                <span className="text-xs text-zinc-500">
                  Uploaded
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <button
          className="h-11 rounded-full bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creating..." : "Create business"}
        </button>
      </form>

      {message && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}
    </div>
  );
}
