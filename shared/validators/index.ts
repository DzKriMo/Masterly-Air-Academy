import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const courseSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  title: z.string().min(1, 'Title is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  room: z.string().optional(),
});

export const flightLessonSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  aircraft: z.string().min(1, 'Aircraft is required'),
  scheduled_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
});

export const invoiceSchema = z.object({
  student: z.string().min(1, 'Student is required'),
  type: z.string().min(1, 'Type is required'),
  amount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be positive'),
  description: z.string().optional(),
  due_at: z.string().optional(),
});

export const paymentSchema = z.object({
  amount: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be positive'),
});

export const messageSchema = z.object({
  receiver: z.string().min(1, 'Recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

export const examSubmitSchema = z.object({
  answers: z.record(z.string()).refine(v => Object.keys(v).length > 0, 'At least one answer is required'),
});

export const safetyEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required'),
  confidential: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
