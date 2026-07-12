import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const courseSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  title: z.string().min(1, "Title is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  room: z.string().optional(),
});

export const flightSchema = z.object({
  student_id: z.string().min(1, "Student is required"),
  aircraft: z.string().min(1, "Aircraft is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
});

export const invoiceSchema = z.object({
  student: z.string().min(1, "Student is required"),
  type: z.string().min(1, "Type is required"),
  amount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Amount must be positive"),
  description: z.string().optional(),
  due_at: z.string().optional(),
});

export const safetySchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().min(1, "Description is required"),
  confidential: z.boolean().optional(),
});

export const messageSchema = z.object({
  receiver: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Message is required"),
});

export const profileSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  password_confirmation: z.string(),
}).refine(d => d.password === d.password_confirmation, { message: "Passwords do not match", path: ["password_confirmation"] });

/** Parse and return field-level errors as a string */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const r = schema.safeParse(data);
  if (r.success) return r;
  const first = r.error.errors[0];
  return { success: false, error: `${first.path.join(".") || "field"}: ${first.message}` };
}
