// ============================================================
// MASTERLY AIR ACADEMY — Shared TypeScript Types
// ============================================================

export type UserRole =
  | 'director_general' | 'head_of_training'
  | 'chief_ground_instructor' | 'ground_instructor'
  | 'chief_flight_instructor' | 'flight_instructor'
  | 'system_admin' | 'admin_responsible' | 'admin_agent'
  | 'finance_responsible' | 'accounting_agent'
  | 'admissions_responsible'
  | 'quality_manager' | 'compliance_monitoring_manager' | 'safety_manager'
  | 'scheduler'
  | 'student' | 'candidate' | 'graduate';

export type UserStatus = 'active' | 'suspended' | 'archived' | 'pending';
export type TrainingProgram = 'PPL' | 'CPL' | 'IR' | 'MEP' | 'MCC';
export type FlightStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
export type AuditAction = 'create' | 'update' | 'delete' | 'validate' | 'publish' | 'login' | 'logout' | 'download' | 'signature';
export type Locale = 'en' | 'fr' | 'ar';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  is_active: boolean;
  last_login_at: string | null;
  permissions: string[];
  roles?: string[];
}

export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  program: TrainingProgram;
  enrollment_date: string;
}

export interface Aircraft {
  id: string;
  registration: string;
  manufacturer: string | null;
  model: string | null;
  status: string;
  airframe_hours: number;
}

export interface FlightLesson {
  id: string;
  student_id: string;
  instructor_id: string;
  aircraft_id: string;
  scheduled_date: string;
  status: FlightStatus;
  flight_duration: number | null;
  grade: number | null;
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  duration: number;
  passing_grade: number;
  max_attempts: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  entity: string;
  entity_id: string | null;
  created_at: string;
}
