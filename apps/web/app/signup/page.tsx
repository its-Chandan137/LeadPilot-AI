import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      heading="Create your account"
      subtitle="Start capturing leads with your own AI chat widget."
      footerText="Already have an account? "
      footerLinkText="Sign In"
      footerHref="/login"
    >
      <SignupForm />
    </AuthShell>
  );
}
