"use client";

import { CrudPage, CrudPageConfig, CrudField } from "@/components/crud-page";
import type { Column } from "@/components/data-table";
import { formatDateTime } from "@/lib/format-utils";

interface Booking {
  id: string;
  resource_type: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  activity_type: string | null;
  activity_id: string | null;
  status: string;
  notes: string | null;
}

const RESOURCE_TYPES = ["aircraft", "simulator", "room"];
const BOOKING_STATUSES = ["confirmed", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  aircraft: "bg-blue-500/10 text-blue-400",
  simulator: "bg-purple-500/10 text-purple-400",
  room: "bg-amber-500/10 text-amber-400",
};

const fmtStatus = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const INIT_FORM = {
  resource_type: "aircraft",
  resource_id: "",
  start_time: "",
  end_time: "",
  activity_type: "",
  activity_id: "",
  status: "confirmed",
  notes: "",
};

const config: CrudPageConfig<Booking> = {
  queryKey: ["admin-bookings"],
  endpoint: "/resource-bookings/",
  initialCreate: INIT_FORM,

  fields: (mode): CrudField[] => {
    const f: CrudField[] = [
      { name: "resource_type", label: "Resource Type", type: "select", span: "half", required: mode === "create", options: RESOURCE_TYPES.map((t) => ({ value: t, label: fmtStatus(t) })) },
      { name: "resource_id", label: "Resource ID", type: "text", span: "half", required: mode === "create", requiredForSubmit: true, placeholder: "UUID...", mono: true },
      { name: "start_time", label: "Start", type: "datetime", span: "half", required: mode === "create", requiredForSubmit: true },
      { name: "end_time", label: "End", type: "datetime", span: "half", required: mode === "create", requiredForSubmit: true },
      { name: "status", label: "Status", type: "select", span: "half", options: BOOKING_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })) },
      { name: "activity_type", label: "Activity Type", type: "text", span: "half", placeholder: "flight_lesson" },
    ];
    if (mode === "create") {
      f.push({ name: "activity_id", label: "Activity ID", type: "text", span: "full", mono: true });
    }
    f.push({ name: "notes", label: "Notes", type: "textarea", span: "full", rows: 2 });
    return f;
  },
  buildForm: (b) => ({
    resource_type: b.resource_type,
    resource_id: b.resource_id,
    start_time: new Date(b.start_time).toISOString().slice(0, 16),
    end_time: new Date(b.end_time).toISOString().slice(0, 16),
    activity_type: b.activity_type || "",
    activity_id: b.activity_id || "",
    status: b.status,
    notes: b.notes || "",
  }),
  buildPayload: (f) => ({ ...f, activity_type: f.activity_type || null, activity_id: f.activity_id || null, notes: f.notes || null }),

  columns: [
    { key: "resource_type", header: "Type", render: (b) => <span className={`text-xs px-2 py-0.5 rounded ${TYPE_COLORS[b.resource_type] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(b.resource_type)}</span> },
    { key: "resource_id", header: "Resource", render: (b) => <span className="text-sm font-mono text-gray-300">{b.resource_id.slice(0, 8)}…</span> },
    { key: "start_time", header: "Start", render: (b) => <span className="text-sm text-gray-300">{formatDateTime(b.start_time)}</span> },
    { key: "end_time", header: "End", render: (b) => <span className="text-sm text-gray-300">{formatDateTime(b.end_time)}</span> },
    { key: "status", header: "Status", render: (b) => <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtStatus(b.status)}</span> },
  ],

  filterFields: [
    { key: "resource_type", label: "All Types", options: RESOURCE_TYPES.map((t) => ({ value: t, label: fmtStatus(t) })) },
    { key: "status", label: "All Statuses", options: BOOKING_STATUSES.map((s) => ({ value: s, label: fmtStatus(s) })) },
  ],
  searchFields: ["resource_type", "notes"],
  searchPlaceholder: "Search bookings...",

  detailFields: (b) => [
    { label: "Resource Type", value: fmtStatus(b.resource_type) },
    { label: "Resource ID", value: b.resource_id },
    { label: "Start", value: formatDateTime(b.start_time) },
    { label: "End", value: formatDateTime(b.end_time) },
    { label: "Status", value: fmtStatus(b.status) },
    { label: "Activity", value: b.activity_type ? `${b.activity_type} (${b.activity_id?.slice(0, 8) || ""})` : "—" },
    { label: "Notes", value: b.notes || "—" },
  ],

  titleKey: "admin.resourceBookings",
  titleFallback: "Resource Bookings",
  backHref: "/admin/dashboard",
  backLabelKey: "common.back",
  backLabelFallback: "Back to Dashboard",
  createLabel: "+ New Booking",
  createTitle: "New Booking",
  editTitle: "Edit Booking",
  detailTitle: "Booking Details",
  deleteTitle: "Delete Booking",
  deleteMessage: "Delete this booking?",
  emptyTitle: "No bookings yet",
  emptyMessage: "No bookings yet.",
  emptyActionLabel: "New Booking",
  errorFallback: "Failed to load",
  toasts: { create: "Booking created", update: "Updated", delete: "Deleted" },
};

export default function AdminResourceBookingsPage() {
  return <CrudPage<Booking> {...config} />;
}
