// ============================================================
// MASTERLY AIR ACADEMY | Portal Access Control
// ============================================================

export const USER_ROLES = [
  'director_general', 'head_of_training',
  'chief_ground_instructor', 'ground_instructor',
  'chief_flight_instructor', 'flight_instructor',
  'system_admin', 'admin_responsible', 'admin_agent',
  'finance_responsible', 'accounting_agent',
  'admissions_responsible',
  'quality_manager', 'compliance_monitoring_manager', 'safety_manager',
  'scheduler',
  'student', 'candidate', 'graduate',
] as const;

export type UserRole = typeof USER_ROLES[number];

const PORTAL_MAP: Record<string, { label: string; defaultPath: string; usesDjangoAdmin: boolean }> = {
  system_admin:               { label: 'Administration', defaultPath: '/admin', usesDjangoAdmin: true },
  admin_responsible:          { label: 'Administration', defaultPath: '/admin', usesDjangoAdmin: true },
  admin_agent:                { label: 'Administration', defaultPath: '/admin', usesDjangoAdmin: true },
  director_general:           { label: 'Dashboard', defaultPath: '/dashboard', usesDjangoAdmin: false },
  head_of_training:           { label: 'Dashboard', defaultPath: '/dashboard', usesDjangoAdmin: false },
  scheduler:                  { label: 'Dashboard', defaultPath: '/dashboard', usesDjangoAdmin: false },
  admissions_responsible:     { label: 'Administration', defaultPath: '/admin', usesDjangoAdmin: true },
  chief_ground_instructor:    { label: 'Instructor', defaultPath: '/instructor/dashboard', usesDjangoAdmin: false },
  ground_instructor:          { label: 'Instructor', defaultPath: '/instructor/dashboard', usesDjangoAdmin: false },
  chief_flight_instructor:    { label: 'Instructor', defaultPath: '/instructor/dashboard', usesDjangoAdmin: false },
  flight_instructor:          { label: 'Instructor', defaultPath: '/instructor/dashboard', usesDjangoAdmin: false },
  student:                    { label: 'Student', defaultPath: '/student/dashboard', usesDjangoAdmin: false },
  candidate:                  { label: 'Student', defaultPath: '/student/dashboard', usesDjangoAdmin: false },
  graduate:                   { label: 'Student', defaultPath: '/student/dashboard', usesDjangoAdmin: false },
  quality_manager:            { label: 'Quality', defaultPath: '/quality/dashboard', usesDjangoAdmin: false },
  compliance_monitoring_manager: { label: 'Quality', defaultPath: '/quality/dashboard', usesDjangoAdmin: false },
  safety_manager:             { label: 'Quality', defaultPath: '/quality/dashboard', usesDjangoAdmin: false },
  finance_responsible:        { label: 'Finance', defaultPath: '/finance/dashboard', usesDjangoAdmin: false },
  accounting_agent:           { label: 'Finance', defaultPath: '/finance/dashboard', usesDjangoAdmin: false },
};

export function getDefaultPortal(role: string): string {
  return PORTAL_MAP[role]?.defaultPath ?? '/dashboard';
}

/** Check if this role should use Django Admin (was Filament) */
export function usesFilamentAdmin(role: string): boolean {
  return PORTAL_MAP[role]?.usesDjangoAdmin ?? false;
}

export function getPortalLabel(role: string): string {
  return PORTAL_MAP[role]?.label ?? 'Dashboard';
}

export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
