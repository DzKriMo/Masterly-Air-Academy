export function isExamPortalPath(pathname?: string): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/exams/");
}
