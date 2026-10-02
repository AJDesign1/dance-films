import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import LoginScreen from "@/components/platform/LoginScreen";

export default async function LoginPage() {
  // Already signed in → straight to the shop.
  const [user, school] = await Promise.all([getUser(), getCurrentSchool()]);
  if (user) redirect("/shows");

  return (
    <LoginScreen
      schoolName={school?.name ?? "Dance Films"}
      logoWhiteUrl={school?.logo_white_url ?? null}
      heroImageUrl={school?.hero_image_url ?? null}
    />
  );
}
