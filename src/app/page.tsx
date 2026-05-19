export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="w-full max-w-3xl rounded-3xl border border-zinc-200/70 bg-white/80 p-10 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Store Management System
        </h1>
        
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            href="/login"
          >
            Go to Login
          </a>
          <a
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            href="/signup"
          >
            Sign Up
          </a>
        </div>
      </main>
    </div>
  );
}
