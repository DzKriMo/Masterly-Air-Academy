export interface Student {
  id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string;
  program: string;
  status: string;
  enrollment_date: string;
  user: string;
}

export interface Course {
  id: string;
  title: string;
  subject: string;
  subject_title?: string;
  instructor: string;
  instructor_name?: string;
  room: string;
  room_name?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  enrolled_count?: number;
}

export interface Module {
  id: string;
  title: string;
  subject: string;
  order: number;
  progress?: number;
}

export interface FlightLesson {
  id: string;
  student: string;
  student_name?: string;
  instructor: string;
  instructor_name?: string;
  aircraft: string;
  aircraft_registration?: string;
  aircraft_model?: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  status: string;
  flight_duration: number;
  grade: number | null;
  result: string | null;
  maneuvers?: string[];
  remarks?: string;
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  subject: string;
  duration: number;
  passing_grade: number;
  max_attempts: number;
  questions_count?: number;
}

export interface Question {
  id: string;
  exam: string;
  text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  order: number;
}

export interface QuizAttempt {
  id: string;
  exam: string;
  student: string;
  answers: Record<string, string>;
  score: number | null;
  is_passed: boolean | null;
  started_at: string;
  completed_at: string | null;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  student: string;
  student_name?: string;
  program: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student: string;
  student_name?: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
}

export interface Notification {
  id: string;
  user: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender: string;
  sender_name?: string;
  receiver: string;
  receiver_name?: string;
  subject: string;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MedicalCertificate {
  id: string;
  student: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  document: string;
}

export interface StudentDashboard {
  total_flight_hours: number;
  total_lessons_completed: number;
  theory_progress: number;
  flight_progress: number;
  exam_average: number;
  upcoming_schedule: ScheduleItem[];
  recent_results: ExamResult[];
  unpaid_invoices_count: number;
  expiring_documents: ExpiringDoc[];
}

export interface ScheduleItem {
  type: 'course' | 'flight';
  title: string;
  date: string;
  time?: string;
  aircraft?: string;
}

export interface ExamResult {
  exam: string;
  score: number | null;
  passed: boolean;
  date: string | null;
}

export interface ExpiringDoc {
  type: string;
  expiry_date: string;
  issuer: string;
}

export interface AttendanceRecord {
  id: string;
  student: string;
  student_name?: string;
  course: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}
