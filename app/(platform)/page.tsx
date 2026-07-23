import { redirect } from "next/navigation";

// Login-first entry: everything funnels through /shows, which sends signed-out
// visitors to /login. (The Stage 2 theming proof lived here; it's in git history.)
export default function Home() {
  redirect("/shows");
}
