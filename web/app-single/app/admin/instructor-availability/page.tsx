"use client";

import { CrudPage, CrudPageConfig, CrudField } from "@/components/crud-page";
import type { Column } from "@/components/data-table";

interface Availability {
  id: string;
  instructor: string;
  instructor_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function fmtTime(t: string) {
  if (!t) return "—";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${ampm}`;
  } catch {
    return t;
  }
}

const INIT_FORM = { instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true };

const config: CrudPageConfig<Availability> = {
  queryKey: ["admin-availability"],
  endpoint: "/instructor-availability/",
  initialCreate: INIT_FORM,
  lookup: { key: "instructors", queryKey: ["admin-avail-instructors"], endpoint: "/flight-instructors/" },

  fields: (mode): CrudField[] => [
    {
      name: "instructor",
      label: "Instructor",
      type: "select",
      required: mode === "create",
      requiredForSubmit: true,
      placeholder: mode === "create" ? "Select instructor..." : undefined,
      options: (lk) => (lk.instructors ?? []).map((i: any) => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })),
    },
    { name: "day_of_week", label: mode === "create" ? "Day of Week" : "Day", type: "select", options: DAY_NAMES.map((d, i) => ({ value: String(i), label: d })) },
    { name: "start_time", label: mode === "create" ? "Start Time" : "Start", type: "time", span: "half" },
    { name: "end_time", label: mode === "create" ? "End Time" : "End", type: "time", span: "half" },
    { name: "is_available", label: "Available", type: "checkbox" },
  ],
  buildForm: (a) => ({
    instructor: a.instructor,
    day_of_week: String(a.day_of_week),
    start_time: a.start_time,
    end_time: a.end_time,
    is_available: a.is_available,
  }),
  buildPayload: (f) => ({ ...f, day_of_week: parseInt(f.day_of_week, 10) }),
  createPayload: (f) => ({ ...f, day_of_week: parseInt(f.day_of_week, 10), instructor: f.instructor || null }),

  columns: [
    { key: "instructor_name", header: "Instructor", render: (a) => <span className="text-sm font-semibold text-white">{a.instructor_name}</span> },
    { key: "day_of_week", header: "Day", render: (a) => <span className="text-sm text-gray-300">{DAY_NAMES[a.day_of_week] || "—"}</span> },
    { key: "start_time", header: "Start", render: (a) => <span className="text-sm text-gray-300">{fmtTime(a.start_time)}</span> },
    { key: "end_time", header: "End", render: (a) => <span className="text-sm text-gray-300">{fmtTime(a.end_time)}</span> },
    { key: "is_available", header: "Available", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.is_available ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{a.is_available ? "Yes" : "No"}</span> },
  ],

  filterFields: [
    { key: "instructor", label: "All Instructors", options: (lk) => (lk.instructors ?? []).map((i: any) => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })) },
  ],
  searchFields: ["instructor_name"],
  searchPlaceholder: "Search by instructor...",

  detailFields: (a) => [
    { label: "Instructor", value: a.instructor_name },
    { label: "Day", value: DAY_NAMES[a.day_of_week] || "—" },
    { label: "Start Time", value: fmtTime(a.start_time) },
    { label: "End Time", value: fmtTime(a.end_time) },
    { label: "Available", value: a.is_available ? "Yes" : "No" },
  ],

  titleKey: "admin.instructorAvailability",
  titleFallback: "Instructor Availability",
  backHref: "/admin/dashboard",
  backLabelKey: "common.back",
  backLabelFallback: "Back to Dashboard",
  createLabel: "+ Add Slot",
  createTitle: "Add Availability Slot",
  editTitle: "Edit Slot",
  detailTitle: "Availability Slot",
  deleteTitle: "Delete Slot",
  deleteMessage: "Delete this availability slot?",
  emptyTitle: "No slots yet",
  emptyMessage: "No availability slots.",
  emptyActionLabel: "Add Slot",
  errorFallback: "Failed to load",
  toasts: { create: "Availability added", update: "Updated", delete: "Deleted" },
};

export default function AdminInstructorAvailabilityPage() {
  return <CrudPage<Availability> {...config} />;
}
