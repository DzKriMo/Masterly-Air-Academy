import LibraryPortalPage from "@/lib/library-permissions";

export default function StudentLibraryPage() {
  return <LibraryPortalPage backHref="/student/dashboard" loginHref="/student/login" />;
}
