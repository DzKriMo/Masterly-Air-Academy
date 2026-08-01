import { redirect } from "next/navigation";

export default function Redirect() {
  redirect("/admin/flight-ops?tab=programs");
}

