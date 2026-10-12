import { redirect } from "next/navigation";

// Preserve old links while signup no longer requires an email-confirmation step.
export default function VerifyEmailPage() {
  redirect("/login");
}
