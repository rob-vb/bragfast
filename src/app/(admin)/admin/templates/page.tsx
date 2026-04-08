import { redirect } from "next/navigation";

export default function TemplatesPage() {
  redirect("/admin/kitchen?tab=templates");
}
