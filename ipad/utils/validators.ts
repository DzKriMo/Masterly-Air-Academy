import { z } from 'zod';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function createLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t('validators.invalidEmail')),
    password: z.string().min(6, t('validators.passwordMin')),
  });
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export const examSubmitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export type ExamSubmitData = z.infer<typeof examSubmitSchema>;

export function createMessageSchema(t: (key: string) => string) {
  return z.object({
    receiver: z.string().uuid(t('validators.invalidRecipient')),
    subject: z.string().min(1, t('validators.subjectRequired')),
    body: z.string().min(1, t('validators.bodyRequired')),
  });
}

export type MessageFormData = z.infer<ReturnType<typeof createMessageSchema>>;

export function createProfileUpdateSchema(t: (key: string) => string) {
  return z.object({
    address: z.string().optional(),
    phone: z.string().optional(),
    nationality: z.string().optional(),
  });
}

export type ProfileUpdateData = z.infer<ReturnType<typeof createProfileUpdateSchema>>;
