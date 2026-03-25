import { redirect } from "next/navigation";

export default function TemplatesPage() {
  redirect("/dashboard/kitchen?tab=templates");
}
