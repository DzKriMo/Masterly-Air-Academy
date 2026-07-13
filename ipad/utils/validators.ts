import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const examSubmitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export type ExamSubmitData = z.infer<typeof examSubmitSchema>;

export const messageSchema = z.object({
  receiver: z.string().uuid('Please select a valid recipient'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

export type MessageFormData = z.infer<typeof messageSchema>;

export const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
