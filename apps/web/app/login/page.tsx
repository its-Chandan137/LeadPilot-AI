import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold">Log in</h1>
      <p className="mt-2 text-slate-600">Supabase Auth will be connected after the widget pipe is proven.</p>
      <form className="mt-8 space-y-4 rounded-lg border bg-white p-6">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" type="email" />
        <input className="w-full rounded-md border px-3 py-2" placeholder="Password" type="password" />
        <button className="w-full rounded-md bg-slate-950 px-4 py-2 text-white" type="button">Continue</button>
      </form>
      <Link className="mt-4 text-sm text-blue-700" href="/signup">Create an account</Link>
    </main>
  );
}
