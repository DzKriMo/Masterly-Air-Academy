import { redirect } from "next/navigation";

export default function Redirect() {
  redirect("/admin/evaluations?tab=progress");
}

