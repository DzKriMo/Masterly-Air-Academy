"use client";

import { CrudPage, CrudPageConfig, CrudField, CrudActions } from "@/components/crud-page";
import type { Column } from "@/components/data-table";

interface AP {
  id: string;
  user: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
}

const INIT_FORM = { user: "", first_name: "", last_name: "", department: "" };

const config: CrudPageConfig<AP> = {
  queryKey: ["admin-ap"],
  endpoint: "/admin-profiles/",
  initialCreate: INIT_FORM,
  lookup: { key: "users", queryKey: ["admin-ap-users"], endpoint: "/users/" },

  showFilterBar: false,
  searchFields: ["first_name", "last_name", "department"],

  fields: (mode): CrudField[] => [
    {
      name: "user",
      label: "User",
      type: "select",
      required: mode === "create",
      requiredForSubmit: true,
      placeholder: mode === "create" ? "Select user..." : "Select...",
      options: (lk) => (lk.users ?? []).map((u: any) => ({ value: u.id, label: u.email })),
    },
    { name: "first_name", label: "First Name", type: "text", span: "half" },
    { name: "last_name", label: "Last Name", type: "text", span: "half" },
    { name: "department", label: "Department", type: "text" },
  ],
  buildForm: (a) => ({ user: a.user, first_name: a.first_name || "", last_name: a.last_name || "", department: a.department || "" }),
  buildPayload: (f) => ({ user: f.user, first_name: f.first_name || null, last_name: f.last_name || null, department: f.department || null }),

  columns: [
    { key: "first_name", header: "Name", render: (a) => <span className="text-sm font-semibold text-white">{`${a.first_name || ""} ${a.last_name || ""}`.trim() || "—"}</span> },
    { key: "department", header: "Department", render: (a) => <span className="text-sm text-gray-300">{a.department || "—"}</span> },
  ],
  renderActions: (_item: AP, { onEdit, onDelete, t }: CrudActions) => (
    <>
      <button onClick={onEdit} className="px-2 py-1 text-xs text-gold-500 hover:bg-gold-500/10 rounded transition-colors">{t("common.edit")}</button>
      <button onClick={onDelete} className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors">{t("common.delete")}</button>
    </>
  ),

  detailFields: (a) => [
    { label: "First Name", value: a.first_name || "—" },
    { label: "Last Name", value: a.last_name || "—" },
    { label: "Department", value: a.department || "—" },
  ],

  titleKey: "admin.adminProfiles",
  titleFallback: "Admin Profiles",
  backHref: "/admin/dashboard",
  backLabelKey: "common.back",
  backLabelFallback: "Back",
  createLabel: "+ New Profile",
  createTitle: "New Profile",
  editTitle: "Edit Profile",
  detailTitle: "Profile Details",
  deleteTitle: "Delete Profile",
  deleteMessage: "Remove this admin profile?",
  emptyTitle: "No profiles",
  emptyMessage: "No admin profiles yet.",
  emptyActionLabel: "New Profile",
  errorFallback: "Failed",
  formErrorFallback: "Failed",
  deleteErrorFallback: "Failed",
  toasts: { create: "Profile created", update: "Profile updated", delete: "Profile deleted" },
};

export default function AdminAdminProfilesPage() {
  return <CrudPage<AP> {...config} />;
}
