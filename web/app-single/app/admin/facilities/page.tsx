"use client";
import { useState } from "react";
import { DoorOpen, Plane, Monitor, CalendarClock } from "lucide-react";
import { HubLayout, HubTab } from "@/components/hub-layout";
import { HubCrud } from "@/components/hub-crud";
import { api } from "@/lib/api";
import { fmtLabel, formatDate, toDatetimeLocal } from "@/lib/format-utils";

const TABS: HubTab[] = [
  { id: "rooms", label: "Rooms", icon: DoorOpen },
  { id: "aircraft", label: "Aircraft", icon: Plane },
  { id: "simulators", label: "Simulators", icon: Monitor },
  { id: "sessions", label: "Sim Sessions", icon: CalendarClock },
];

export default function FacilitiesHubPage() {
  return (
    <HubLayout title="Facilities Hub" tabs={TABS} defaultTab="rooms">
      {(active) => (
        <>
          {active === "rooms" && <RoomsTab />}
          {active === "aircraft" && <AircraftTab />}
          {active === "simulators" && <SimulatorsTab />}
          {active === "sessions" && <SessionsTab />}
        </>
      )}
    </HubLayout>
  );
}

const ROOM_STATUSES = ["available", "occupied", "maintenance", "out_of_service"];
const ROOM_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  occupied: "bg-blue-500/10 text-blue-400",
  maintenance: "bg-amber-500/10 text-amber-400",
  out_of_service: "bg-red-500/10 text-red-400",
};

function RoomsTab() {
  return (
    <HubCrud<Room>
      queryKey={["admin-rooms"]}
      endpoint="/rooms/"
      titleFallback="Rooms"
      emptyTitle="No rooms yet"
      emptyMessage="Add classrooms and training rooms."
      emptyActionLabel="+ New Room"
      createTitle="New Room"
      editTitle="Edit Room"
      createLabel="+ New Room"
      searchPlaceholder="Search room..."
      searchFields={["name"]}
      filterFields={[{ key: "status", label: "All Statuses", options: ROOM_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) }]}
      allowDelete={false}
      initialCreate={{ name: "", capacity: "", location: "", equipment: "", status: "available" }}
      buildForm={(r) => ({ name: r.name, capacity: r.capacity != null ? String(r.capacity) : "", location: r.location || "", equipment: parseEquipment(r.equipment).join(", "), status: r.status })}
      buildPayload={(f) => ({
        name: f.name,
        capacity: f.capacity,
        location: f.location || null,
        equipment: f.equipment ? f.equipment.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        status: f.status,
      })}
      fields={(mode) => [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "capacity", label: "Capacity", type: "text", span: "half" },
        { name: "status", label: "Status", type: "select", options: ROOM_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })), span: "half" },
        { name: "location", label: "Location", type: "text" },
        { name: "equipment", label: "Equipment (comma separated)", type: "text", placeholder: "Projector, whiteboard, desks" },
      ]}
      columns={[
        { key: "name", header: "Name", render: (r) => <span className="text-sm font-semibold text-white">{r.name}</span> },
        { key: "capacity", header: "Capacity", render: (r) => <span className="text-sm text-gray-300 font-mono">{r.capacity}</span> },
        { key: "location", header: "Location", render: (r) => <span className="text-sm text-gray-300">{r.location || "—"}</span> },
        { key: "status", header: "Status", render: (r) => <span className={`text-xs px-2 py-0.5 rounded ${ROOM_COLORS[r.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(r.status)}</span> },
      ]}
      detailTitle="Room Details"
      detailFields={(r) => [
        { label: "Name", value: r.name },
        { label: "Capacity", value: String(r.capacity) },
        { label: "Location", value: r.location || "—" },
        { label: "Status", value: fmtLabel(r.status) },
        { label: "Equipment", value: parseEquipment(r.equipment).join(", ") || "—" },
      ]}
    />
  );
}
interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: any;
  status: string;
}
function parseEquipment(eq: any): string[] {
  if (Array.isArray(eq)) return eq;
  if (typeof eq === "string") {
    try {
      const p = JSON.parse(eq);
      if (Array.isArray(p)) return p;
    } catch {}
    return eq ? [eq] : [];
  }
  if (eq && typeof eq === "object") {
    return Object.entries(eq).filter(([, v]) => v).map(([k]) => k);
  }
  return [];
}

const AIRCRAFT_STATUSES = ["active", "in_maintenance", "grounded", "retired"];
const AIRCRAFT_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  in_maintenance: "bg-amber-500/10 text-amber-400",
  grounded: "bg-red-500/10 text-red-400",
  retired: "bg-gray-500/10 text-gray-400",
};

function AircraftTab() {
  return (
    <HubCrud<Aircraft>
      queryKey={["admin-aircraft"]}
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
      detailExtra={(a) => <ScheduleMaintenance aircraftId={a.id} registration={a.registration} />}
    />
  );
}
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

const MAINT_TYPES = ["routine", "scheduled", "unscheduled", "inspection", "repair", "overhaul", "modification", "other"];

function ScheduleMaintenance({ aircraftId, registration }: { aircraftId: string; registration: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "routine", description: "", start_date: "", end_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!form.start_date) { setError("Start date is required"); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/maintenance-records/", {
        aircraft: aircraftId,
        type: form.type,
        description: form.description || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
        status: "scheduled",
      });
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to schedule maintenance");
    }
    setSaving(false);
  };
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="mt-3 px-3 py-1.5 text-xs bg-navy-700 text-gold-500 rounded-lg hover:bg-navy-600 transition-colors"
      >
        {open ? "Cancel" : "Schedule Maintenance"}
      </button>
      {open && (
        <div className="mt-3 bg-navy-900 border border-navy-700 rounded-lg p-4 space-y-3">
          <p className="text-sm text-white font-medium">Schedule Maintenance — {registration}</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="px-2 py-1.5 bg-navy-800 border border-navy-700 rounded text-sm text-white">
              {MAINT_TYPES.map((t) => <option key={t} value={t}>{fmtLabel(t)}</option>)}
            </select>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="px-2 py-1.5 bg-navy-800 border border-navy-700 rounded text-sm text-white" />
            <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} className="px-2 py-1.5 bg-navy-800 border border-navy-700 rounded text-sm text-white" />
            <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="px-2 py-1.5 bg-navy-800 border border-navy-700 rounded text-sm text-white" />
          </div>
          <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="w-full px-2 py-1.5 bg-navy-800 border border-navy-700 rounded text-sm text-white" />
          <button onClick={submit} disabled={saving} className="px-3 py-1.5 text-xs bg-gold-500 text-navy-900 font-semibold rounded-lg disabled:opacity-50">
            {saving ? "Scheduling..." : "Schedule"}
          </button>
        </div>
      )}
    </div>
  );
}

const SIM_STATUSES = ["available", "in_use", "in_maintenance", "offline"];
const SIM_COLORS: Record<string, string> = {
  available: "bg-green-500/10 text-green-400",
  in_use: "bg-blue-500/10 text-blue-400",
  in_maintenance: "bg-amber-500/10 text-amber-400",
  offline: "bg-gray-500/10 text-gray-400",
};
const QUAL_TYPES = ["FNPT II", "FNPT II MCC", "FTD", "FFS", "Other"];

function SimulatorsTab() {
  return (
    <HubCrud<Simulator>
      queryKey={["admin-simulators"]}
      endpoint="/simulators/"
      titleFallback="Simulators"
      emptyTitle="No simulators yet"
      emptyMessage="Add flight simulators."
      emptyActionLabel="+ New Simulator"
      createTitle="New Simulator"
      editTitle="Edit Simulator"
      createLabel="+ New Simulator"
      searchPlaceholder="Search name, manufacturer..."
      searchFields={["name", "manufacturer", "model_name"]}
      filterFields={[{ key: "status", label: "All Statuses", options: SIM_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) }]}
      allowDelete={false}
      initialCreate={{ name: "", manufacturer: "", model_name: "", qualification_type: "", location: "", status: "available" }}
      buildForm={(s) => ({ name: s.name, manufacturer: s.manufacturer || "", model_name: s.model_name || "", qualification_type: s.qualification_type || "", location: s.location || "", status: s.status })}
      buildPayload={(f) => ({
        name: f.name,
        manufacturer: f.manufacturer || null,
        model_name: f.model_name || null,
        qualification_type: f.qualification_type || null,
        location: f.location || null,
        status: f.status,
      })}
      fields={(mode) => [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "manufacturer", label: "Manufacturer", type: "text", span: "half" },
        { name: "model_name", label: "Model", type: "text", span: "half" },
        { name: "qualification_type", label: "Qualification", type: "select", placeholder: "Select type", options: QUAL_TYPES.map((q) => ({ value: q, label: q })) },
        { name: "location", label: "Location", type: "text", span: "half" },
        { name: "status", label: "Status", type: "select", options: SIM_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })), span: "half" },
      ]}
      columns={[
        { key: "name", header: "Name", render: (s) => <span className="text-sm font-semibold text-white">{s.name}</span> },
        { key: "manufacturer", header: "Manufacturer", render: (s) => <span className="text-sm text-gray-300">{s.manufacturer || "—"}</span> },
        { key: "model_name", header: "Model", render: (s) => <span className="text-sm text-gray-300">{s.model_name || "—"}</span> },
        { key: "qualification_type", header: "Qualification", render: (s) => <span className="text-xs text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded font-mono">{s.qualification_type || "—"}</span> },
        { key: "location", header: "Location", render: (s) => <span className="text-sm text-gray-300">{s.location || "—"}</span> },
        { key: "status", header: "Status", render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${SIM_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(s.status)}</span> },
      ]}
      detailTitle="Simulator Details"
      detailFields={(s) => [
        { label: "Name", value: s.name },
        { label: "Manufacturer", value: s.manufacturer || "—" },
        { label: "Model", value: s.model_name || "—" },
        { label: "Qualification", value: s.qualification_type || "—" },
        { label: "Location", value: s.location || "—" },
        { label: "Status", value: fmtLabel(s.status) },
        { label: "Next Maintenance", value: formatDate(s.next_maintenance) },
      ]}
    />
  );
}
interface Simulator {
  id: string;
  name: string;
  manufacturer: string | null;
  model_name: string | null;
  qualification_type: string | null;
  location: string | null;
  status: string;
  next_maintenance?: string | null;
}

const SESSION_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
const SESSION_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  completed: "bg-green-500/10 text-green-400",
  cancelled: "bg-gray-500/10 text-gray-400",
};

function SessionsTab() {
  return (
    <HubCrud<Session>
      queryKey={["admin-sim-sessions"]}
      endpoint="/simulator-sessions/"
      titleFallback="Simulator Sessions"
      emptyTitle="No sessions yet"
      emptyMessage="Book students into simulator sessions."
      emptyActionLabel="+ New Session"
      createTitle="New Session"
      editTitle="Edit Session"
      createLabel="+ New Session"
      searchPlaceholder="Search simulator or student..."
      searchFields={["simulator_name", "student_name", "instructor_name"]}
      filterFields={[
        { key: "status", label: "All Statuses", options: SESSION_STATUSES.map((s) => ({ value: s, label: fmtLabel(s) })) },
        { key: "simulator", label: "All Simulators", options: (lk) => (lk.simulators || []).map((s: any) => ({ value: s.id, label: s.name })) },
      ]}
      lookups={[
        { key: "simulators", queryKey: ["admin-sim-simulators"], endpoint: "/simulators/" },
        { key: "students", queryKey: ["admin-sim-students"], endpoint: "/students/" },
        { key: "instructors", queryKey: ["admin-sim-instructors"], endpoint: "/flight-instructors/" },
      ]}
      allowEdit={false}
      allowDelete={false}
      initialCreate={{ simulator: "", student: "", instructor: "", scheduled_date: "", duration: "" }}
      buildForm={(s) => ({ simulator: s.simulator, student: s.student, instructor: s.instructor, scheduled_date: toDatetimeLocal(s.scheduled_date), duration: s.duration != null ? String(s.duration) : "" })}
      buildPayload={(f) => ({
        simulator: f.simulator,
        student: f.student,
        instructor: f.instructor,
        scheduled_date: f.scheduled_date,
        duration: f.duration ? parseFloat(f.duration) : null,
      })}
      fields={(mode) => [
        { name: "simulator", label: "Simulator", type: "select", required: true, placeholder: "Select simulator", options: (lk) => (lk.simulators || []).map((s: any) => ({ value: s.id, label: s.name })) },
        { name: "student", label: "Student", type: "select", required: true, placeholder: "Select student", options: (lk) => (lk.students || []).map((s: any) => ({ value: s.id, label: s.full_name || `${s.first_name} ${s.last_name}` })) },
        { name: "instructor", label: "Instructor", type: "select", required: true, placeholder: "Select instructor", options: (lk) => (lk.instructors || []).map((i: any) => ({ value: i.id, label: i.first_name + " " + i.last_name })) },
        { name: "scheduled_date", label: "Scheduled Date", type: "datetime", required: true },
        { name: "duration", label: "Duration (h)", type: "text", span: "half" },
      ]}
      columns={[
        { key: "simulator_name", header: "Simulator", render: (s) => <span className="text-sm font-semibold text-white">{s.simulator_name}</span> },
        { key: "student_name", header: "Student", render: (s) => <span className="text-sm text-gray-300">{s.student_name}</span> },
        { key: "instructor_name", header: "Instructor", render: (s) => <span className="text-sm text-gray-300">{s.instructor_name}</span> },
        { key: "scheduled_date", header: "Scheduled", render: (s) => <span className="text-sm text-gray-400">{formatDate(s.scheduled_date)}</span> },
        { key: "duration", header: "Duration", render: (s) => <span className="text-sm text-gray-400 font-mono">{s.duration ?? "—"}</span> },
        { key: "status", header: "Status", render: (s) => <span className={`text-xs px-2 py-0.5 rounded ${SESSION_COLORS[s.status] || "bg-gray-500/10 text-gray-400"}`}>{fmtLabel(s.status)}</span> },
      ]}
      detailTitle="Session Details"
      detailFields={(s) => [
        { label: "Simulator", value: s.simulator_name },
        { label: "Student", value: s.student_name },
        { label: "Instructor", value: s.instructor_name },
        { label: "Scheduled", value: formatDate(s.scheduled_date) },
        { label: "Duration", value: s.duration != null ? String(s.duration) : "—" },
        { label: "Status", value: fmtLabel(s.status) },
        ...(s.notes ? [{ label: "Notes", value: s.notes }] : []),
      ]}
    />
  );
}
interface Session {
  id: string;
  simulator: string;
  simulator_name: string;
  student: string;
  student_name: string;
  instructor: string;
  instructor_name: string;
  scheduled_date: string;
  duration: number | null;
  status: string;
  notes?: string | null;
}
