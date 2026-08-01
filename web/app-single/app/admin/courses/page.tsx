import { redirect } from "next/navigation";

export default function Redirect() {
  redirect("/admin/courses-attendance?tab=courses");
}

