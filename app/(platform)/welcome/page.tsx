import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import WelcomeForm from "@/components/platform/WelcomeForm";

export default async function WelcomePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  // Already named → nothing to capture.
  if (profile.name && profile.name.trim() !== "") redirect("/shows");

  return <WelcomeForm />;
}
