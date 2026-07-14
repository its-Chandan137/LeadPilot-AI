import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: { searchParams?: { next?: string } }) {
  const nextPath = searchParams?.next?.startsWith("/") ? searchParams.next : "/dashboard";

  return (
    <AuthShell
      heading="Welcome Back"
      subtitle="Enter your details to sign in to your workspace."
      footerText="Don't have an account? "
      footerLinkText="Sign Up"
      footerHref="/signup"
    >
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
