import { redirect } from "next/navigation";

export default function Redirect() {
  redirect("/admin/assessments?tab=exams");
}

