"use client";
import { Wrench, CalendarClock, Users, Plane } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { fmtLabel, formatDate, formatDateTime } from "@/lib/format-utils";

const TABS: HubTab[] = [
  { id: "aircraft", label: "Aircraft", icon: Plane },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "bookings", label: "Resource Bookings", icon: CalendarClock },
  { id: "availability", label: "Instructor Availability", icon: Users },
];

export default function FlightResourcesHubPage() {
  return (
    <HubLayout title="Flight Resources" tabs={TABS} defaultTab="aircraft">
      {(active) => (
        <>
          {active === "aircraft" && <AircraftTab />}
          {active === "maintenance" && <MaintenanceTab />}
          {active === "bookings" && <BookingsTab />}
          {active === "availability" && <AvailabilityTab />}
        </>
      )}
    </HubLayout>
  );
}

const AIRCRAFT_STATUSES = ["available", "in_maintenance", "reserved", "retired"];
const AIRCRAFT_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  active: "bg-blue-500/10 text-blue-400",
  in_maintenance: "bg-amber-500/10 text-amber-400",
  reserved: "bg-purple-500/10 text-purple-400",
  retired: "bg-gray-500/10 text-gray-400",
};

interface Aircraft {
  id: string;
  registration: string;
  manufacturer: string | null;
  model: string | null;
  serial_number?: string;
  year_of_manufacture?: number;
  status: string;
  airframe_hours?: number;
  engine_hours?: number;
  total_hours?: number;
  next_maintenance?: string;
}

function AircraftTab() {
  return (
    <HubCrud<Aircraft>
      queryKey={["admin-resources-aircraft"]}
      endpoint="/aircraft/"
      titleFallback="Aircraft"
      emptyTitle="No aircraft yet"
      emptyMessage="Add your fleet."
      emptyActionLabel="+ New Aircraft"
      createTitle="New Aircraft"
      editTitle="Edit Aircraft"
      createLabel="+ New Aircraft"
      searchPlaceholder="Search registration, model..."
      searchFields={["registration", "model", "manufacturer"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: AIRCRAFT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "manufacturer", label: "All Manufacturers", options: ["Cessna", "Piper", "Beechcraft", "Diamond", "Cirrus", "Mooney", "Other"].map((m) => ({ value: m, label: m })) },
      ]}
      initialCreate={{ registration: "", manufacturer: "", model: "", serial_number: "", year: "", status: "active" }}
      buildForm={(a) => ({ registration: a.registration, manufacturer: a.manufacturer || "", model: a.model || "", serial_number: a.serial_number || "", year: a.year_of_manufacture != null ? String(a.year_of_manufacture) : "", status: a.status })}
      buildPayload={(f) => ({
        registration: f.registration,
        manufacturer: f.manufacturer || null,
        model: f.model || null,
        serial_number: f.serial_number || null,
        year_of_manufacture: f.year ? parseInt(f.year, 10) : null,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "registration", label: "Registration", type: "text", required: true, mono: true, placeholder: "e.g. 7T-MAA" },
        { name: "manufacturer", label: "Manufacturer", type: "select", placeholder: "Select manufacturer", options: ["Cessna", "Piper", "Beechcraft", "Diamond", "Cirrus", "Mooney", "Other"].map((m) => ({ value: m, label: m })) },
        { name: "model", label: "Model", type: "text", span: "half" },
        { name: "serial_number", label: "Serial Number", type: "text", span: "half" },
        { name: "year", label: "Year", type: "text", span: "half" },
        { name: "status", label: "Status", type: "select", options: AIRCRAFT_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })), span: "half" },
      ]}
      columns={[
        { key: "registration", header: "Registration", render: (a) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono font-semibold">{a.registration}</span> },
        { key: "manufacturer", header: "Manufacturer" },
        { key: "model", header: "Model" },
        { key: "status", header: "Status", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${AIRCRAFT_COLORS[a.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(a.status)}</span> },
        { key: "total_hours", header: "Hours", render: (a) => <span className="text-sm text-gray-400 font-mono">{a.total_hours ?? "—"}</span> },
        { key: "next_maintenance", header: "Next Maint.", render: (a) => <span className="text-sm text-gray-400">{formatDate(a.next_maintenance)}</span> },
      ]}
      detailTitle="Aircraft Details"
      detailFields={(a) => [
        { label: "Registration", value: a.registration },
        { label: "Manufacturer", value: a.manufacturer || "—" },
        { label: "Model", value: a.model || "—" },
        { label: "Serial Number", value: a.serial_number || "—" },
        { label: "Year", value: a.year_of_manufacture != null ? String(a.year_of_manufacture) : "—" },
        { label: "Status", value: fmtLabel(a.status) },
        { label: "Airframe Hours", value: a.airframe_hours != null ? String(a.airframe_hours) : "—" },
        { label: "Engine Hours", value: a.engine_hours != null ? String(a.engine_hours) : "—" },
        { label: "Next Maintenance", value: formatDate(a.next_maintenance) },
      ]}
    />
  );
}

const MAINTENANCE_TYPES = ["100h", "annual", "engine", "propeller", "avionics", "inspection", "repair"];
const MAINT_STATUS = ["scheduled", "in_progress", "completed", "cancelled"];
const MAINT_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

interface MaintenanceRecord {
  id: string;
  aircraft: string | null;
  aircraft_registration: string;
  type: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
}

function MaintenanceTab() {
  return (
    <HubCrud<MaintenanceRecord>
      queryKey={["admin-maintenance"]}
      endpoint="/maintenance-records/"
      titleFallback="Maintenance Records"
      emptyTitle="No maintenance records yet"
      emptyMessage="Log scheduled or completed maintenance."
      emptyActionLabel="+ New Record"
      createTitle="New Maintenance Record"
      editTitle="Edit Record"
      createLabel="+ New Record"
      searchPlaceholder="Search registration or type..."
      searchFields={["aircraft_registration", "type"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: MAINT_STATUS.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "type", label: "All Types", options: MAINTENANCE_TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
        { key: "aircraft", label: "All Aircraft", options: (lk) => (lk.aircraft || []).map((a: any) => ({ value: a.id, label: a.registration })) },
      ]}
      lookup={{ key: "aircraft", queryKey: ["admin-maint-aircraft"], endpoint: "/aircraft/" }}
      initialCreate={{ aircraft: "", type: "", description: "", start_date: "", end_date: "", status: "scheduled", notes: "" }}
      buildForm={(r) => ({
        aircraft: r.aircraft || "",
        type: r.type,
        description: r.description || "",
        start_date: r.start_date ? r.start_date.slice(0, 16) : "",
        end_date: r.end_date ? r.end_date.slice(0, 16) : "",
        status: r.status,
        notes: r.notes || "",
      })}
      buildPayload={(f) => ({
        aircraft: f.aircraft || null,
        type: f.type,
        description: f.description || null,
        start_date: f.start_date,
        end_date: f.end_date || null,
        status: f.status,
        notes: f.notes || null,
      })}
      fields={(mode) => [
        { name: "aircraft", label: "Aircraft", type: "select", placeholder: "Select aircraft", options: (lk) => (lk.aircraft || []).map((a: any) => ({ value: a.id, label: a.registration })) },
        { name: "type", label: "Type", type: "select", required: true, options: MAINTENANCE_TYPES.map((t) => ({ value: t, label: fmtLabel(t) })) },
        { name: "description", label: "Description", type: "textarea", rows: 2 },
        { name: "start_date", label: "Start", type: "datetime", required: true, span: "half" },
        { name: "end_date", label: "End", type: "datetime", span: "half" },
        { name: "status", label: "Status", type: "select", options: MAINT_STATUS.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { name: "notes", label: "Notes", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "aircraft_registration", header: "Aircraft", render: (r) => <span className="text-sm font-semibold text-white">{r.aircraft_registration || "—"}</span> },
        { key: "type", header: "Type", render: (r) => <span className="text-sm text-gray-300">{fmtLabel(r.type)}</span> },
        { key: "start_date", header: "Start", render: (r) => <span className="text-sm text-gray-400">{formatDate(r.start_date)}</span> },
        { key: "end_date", header: "End", render: (r) => <span className="text-sm text-gray-400">{r.end_date ? formatDate(r.end_date) : "—"}</span> },
        { key: "status", header: "Status", render: (r) => <span className={`text-xs px-2 py-0.5 rounded ${MAINT_COLORS[r.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(r.status)}</span> },
      ]}
      detailTitle="Maintenance Record"
      detailFields={(r) => [
        { label: "Aircraft", value: r.aircraft_registration || "—" },
        { label: "Type", value: fmtLabel(r.type) },
        { label: "Start", value: formatDateTime(r.start_date) },
        { label: "End", value: r.end_date ? formatDateTime(r.end_date) : "—" },
        { label: "Status", value: fmtLabel(r.status) },
        { label: "Description", value: r.description || "—" },
        { label: "Notes", value: r.notes || "—" },
      ]}
    />
  );
}

const RESOURCE_TYPES = ["aircraft", "simulator", "room"];
const BOOKING_STATUSES = ["confirmed", "cancelled"];
const BOOKING_COLORS: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-400",
  cancelled: "bg-red-500/10 text-red-400",
};
const RESOURCE_COLORS: Record<string, string> = {
  aircraft: "bg-blue-500/10 text-blue-400",
  simulator: "bg-purple-500/10 text-purple-400",
  room: "bg-amber-500/10 text-amber-400",
};

interface Booking {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  start_time: string;
  end_time: string;
  activity_type: string | null;
  activity_id: string | null;
  status: string;
  notes: string | null;
}

function BookingsTab() {
  return (
    <HubCrud<Booking>
      queryKey={["admin-bookings"]}
      endpoint="/resource-bookings/"
      titleFallback="Resource Bookings"
      emptyTitle="No bookings yet"
      emptyMessage="Book aircraft, simulators and rooms."
      emptyActionLabel="+ New Booking"
      createTitle="New Booking"
      editTitle="Edit Booking"
      createLabel="+ New Booking"
      searchPlaceholder="Search bookings..."
      searchFields={["resource_type", "notes"]}
      filterFields={[
        { key: "resource_type", label: "All Types", options: RESOURCE_TYPES.map((t) => ({ value: t, label: cap(t) })) },
        { key: "status", label: "All Statuses", options: BOOKING_STATUSES.map((s) => ({ value: s, label: cap(s) })) },
      ]}
      initialCreate={{ resource_type: "aircraft", resource_id: "", start_time: "", end_time: "", activity_type: "", activity_id: "", status: "confirmed", notes: "" }}
      buildForm={(b) => ({
        resource_type: b.resource_type,
        resource_id: b.resource_id,
        start_time: b.start_time ? new Date(b.start_time).toISOString().slice(0, 16) : "",
        end_time: b.end_time ? new Date(b.end_time).toISOString().slice(0, 16) : "",
        activity_type: b.activity_type || "",
        activity_id: b.activity_id || "",
        status: b.status,
        notes: b.notes || "",
      })}
      buildPayload={(f) => ({ resource_type: f.resource_type, resource_id: f.resource_id, start_time: f.start_time, end_time: f.end_time, activity_type: f.activity_type || null, activity_id: f.activity_id || null, status: f.status, notes: f.notes || null })}
      fields={(mode) => [
        { name: "resource_type", label: "Resource Type", type: "select", required: true, span: "half", options: RESOURCE_TYPES.map((t) => ({ value: t, label: cap(t) })) },
        { name: "resource_id", label: "Resource ID", type: "text", required: true, span: "half", mono: true, placeholder: "UUID..." },
        { name: "start_time", label: "Start", type: "datetime", required: true, span: "half" },
        { name: "end_time", label: "End", type: "datetime", required: true, span: "half" },
        { name: "status", label: "Status", type: "select", span: "half", options: BOOKING_STATUSES.map((s) => ({ value: s, label: cap(s) })) },
        { name: "activity_type", label: "Activity Type", type: "text", span: "half", placeholder: "flight_lesson" },
        { name: "activity_id", label: "Activity ID", type: "text", mono: true, placeholder: "UUID..." },
        { name: "notes", label: "Notes", type: "textarea", rows: 2 },
      ]}
      columns={[
        { key: "resource_type", header: "Type", render: (b) => <span className={`text-xs px-2 py-0.5 rounded ${RESOURCE_COLORS[b.resource_type] || "bg-gray-500/10 text-gray-400"}`}>{cap(b.resource_type)}</span> },
        { key: "resource_id", header: "Resource", render: (b) => <div className="flex items-center gap-2">
            {b.resource_name ? (
              <span className="text-sm font-semibold text-white">{b.resource_name}</span>
            ) : (
              <span className="text-sm font-mono text-gray-300">{b.resource_id.slice(0, 8)}…</span>
            )}
          </div> },
        { key: "start_time", header: "Start", render: (b) => <span className="text-sm text-gray-300">{formatDateTime(b.start_time)}</span> },
        { key: "end_time", header: "End", render: (b) => <span className="text-sm text-gray-300">{formatDateTime(b.end_time)}</span> },
        { key: "status", header: "Status", render: (b) => <span className={`text-xs px-2 py-0.5 rounded ${BOOKING_COLORS[b.status] || "bg-gray-500/10 text-gray-400"}`}>{cap(b.status)}</span> },
      ]}
      detailTitle="Booking Details"
      detailFields={(b) => [
        { label: "Resource Type", value: cap(b.resource_type) },
        { label: "Resource ID", value: b.resource_id },
        { label: "Start", value: formatDateTime(b.start_time) },
        { label: "End", value: formatDateTime(b.end_time) },
        { label: "Status", value: cap(b.status) },
        { label: "Activity", value: b.activity_type ? `${b.activity_type} (${b.activity_id?.slice(0, 8) || ""})` : "—" },
        { label: "Notes", value: b.notes || "—" },
      ]}
    />
  );
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Availability {
  id: string;
  instructor: string;
  instructor_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

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

function AvailabilityTab() {
  return (
    <HubCrud<Availability>
      queryKey={["admin-availability"]}
      endpoint="/instructor-availability/"
      titleFallback="Instructor Availability"
      emptyTitle="No availability slots yet"
      emptyMessage="Set recurring availability per instructor."
      emptyActionLabel="+ Add Slot"
      createTitle="Add Availability Slot"
      editTitle="Edit Slot"
      createLabel="+ Add Slot"
      searchPlaceholder="Search by instructor..."
      searchFields={["instructor_name"]}
      filterFields={[{ key: "instructor", label: "All Instructors", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })) }]}
      lookup={{ key: "instructors", queryKey: ["admin-avail-instructors"], endpoint: "/flight-instructors/" }}
      initialCreate={{ instructor: "", day_of_week: "0", start_time: "08:00", end_time: "17:00", is_available: true }}
      buildForm={(a) => ({ instructor: a.instructor, day_of_week: String(a.day_of_week), start_time: a.start_time, end_time: a.end_time, is_available: a.is_available })}
      buildPayload={(f) => ({ instructor: f.instructor || null, day_of_week: parseInt(f.day_of_week, 10), start_time: f.start_time, end_time: f.end_time, is_available: f.is_available })}
      fields={(mode) => [
        { name: "instructor", label: "Instructor", type: "select", required: true, placeholder: mode === "create" ? "Select instructor..." : undefined, options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: `${i.first_name} ${i.last_name}` })) },
        { name: "day_of_week", label: mode === "create" ? "Day of Week" : "Day", type: "select", options: DAY_NAMES.map((d, i) => ({ value: String(i), label: d })) },
        { name: "start_time", label: mode === "create" ? "Start Time" : "Start", type: "time", span: "half" },
        { name: "end_time", label: mode === "create" ? "End Time" : "End", type: "time", span: "half" },
        { name: "is_available", label: "Available", type: "checkbox" },
      ]}
      columns={[
        { key: "instructor_name", header: "Instructor", render: (a) => <span className="text-sm font-semibold text-white">{a.instructor_name}</span> },
        { key: "day_of_week", header: "Day", render: (a) => <span className="text-sm text-gray-300">{DAY_NAMES[a.day_of_week] || "—"}</span> },
        { key: "start_time", header: "Start", render: (a) => <span className="text-sm text-gray-300">{fmtTime(a.start_time)}</span> },
        { key: "end_time", header: "End", render: (a) => <span className="text-sm text-gray-300">{fmtTime(a.end_time)}</span> },
        { key: "is_available", header: "Available", render: (a) => <span className={`text-xs px-2 py-0.5 rounded ${a.is_available ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{a.is_available ? "Yes" : "No"}</span> },
      ]}
      detailTitle="Availability Slot"
      detailFields={(a) => [
        { label: "Instructor", value: a.instructor_name },
        { label: "Day", value: DAY_NAMES[a.day_of_week] || "—" },
        { label: "Start", value: fmtTime(a.start_time) },
        { label: "End", value: fmtTime(a.end_time) },
        { label: "Available", value: a.is_available ? "Yes" : "No" },
      ]}
    />
  );
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}
