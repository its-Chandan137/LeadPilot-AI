import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextPath = searchParams?.next?.startsWith("/") ? searchParams.next : "/dashboard";

  return (
    <AuthShell>
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
