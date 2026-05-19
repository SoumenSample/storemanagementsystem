"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";

type Category = {
  _id: string;
  name: string;
  description: string | null;
  gstRate: number;
  createdAt: string;
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGstRate, setEditGstRate] = useState(18);

  const categoriesQuery = useQuery<{ items: Category[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, gstRate }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create category");
      }

      return res.json();
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setGstRate(18);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/categories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          gstRate: editGstRate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update category");
      }

      return res.json();
    },
    onSuccess: () => {
      setEditingId(null);
      setEditName("");
      setEditDescription("");
      setEditGstRate(18);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete category");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <SiteHeader />
                    <div className="min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catalog</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Categories</h1>
        <p className="text-sm text-slate-600">
          Create and manage product categories.
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Add category</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_150px_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category name"
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
          />
          <select
            value={gstRate}
            onChange={(event) => setGstRate(Number(event.target.value))}
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
          >
            {[0, 5, 12, 18, 28].map((rate) => (
              <option key={rate} value={rate}>
                GST {rate}%
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => createCategory.mutate()}
            disabled={!name.trim() || createCategory.isPending}
            className="h-11 rounded-xl bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createCategory.isPending ? "Saving..." : "Create category"}
          </button>
        </div>
        {createCategory.isError && (
          <p className="text-sm text-red-600">{(createCategory.error as Error).message}</p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Inventory groups</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Saved categories</h2>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {categoriesQuery.data?.items.length ?? 0} total
          </div>
        </div>

        {categoriesQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-500">Loading categories...</p>
        ) : categoriesQuery.isError ? (
          <p className="mt-4 text-sm text-red-600">Failed to load categories.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">GST Rate</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categoriesQuery.data?.items.map((category) => (
                  <tr key={category._id} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900">{category.name}</td>
                    <td className="px-4 py-3 text-slate-700">{category.description ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{category.gstRate}%</td>
                    <td className="px-4 py-3 text-slate-700">{new Date(category.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(category._id);
                            setEditName(category.name);
                            setEditDescription(category.description ?? "");
                            setEditGstRate(category.gstRate);
                          }}
                          className="text-sm font-semibold text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory.mutate(category._id)}
                          disabled={deleteCategory.isPending}
                          className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categoriesQuery.data?.items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                      No categories added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingId && (
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Edit category</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_150px_auto]">
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Category name"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
            <input
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Description"
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            />
            <select
              value={editGstRate}
              onChange={(event) => setEditGstRate(Number(event.target.value))}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm"
            >
              {[0, 5, 12, 18, 28].map((rate) => (
                <option key={rate} value={rate}>
                  GST {rate}%
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => updateCategory.mutate()}
                disabled={updateCategory.isPending}
                className="h-11 rounded-xl bg-blue-600 px-6 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {updateCategory.isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="h-11 rounded-xl border border-slate-300 px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
          {updateCategory.isError && (
            <p className="text-sm text-red-600">{(updateCategory.error as Error).message}</p>
          )}
        </section>
      )}
    </div>
    </div>
    </div>
  );
}