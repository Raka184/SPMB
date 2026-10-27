import Link from "next/link";
import AdminSidebar from "@/app/admin/AdminSidebar";
import SchoolMark from "@/app/components/SchoolMark";
import StudentLogoutButton from "@/app/siswa/LogoutButton";
import { studentNavigation } from "@/app/siswa/navigation";

export default function StudentPortalFrame({
  student,
  currentSection,
  searchTerm = "",
  children,
}) {
  const firstName = student.full_name.trim().split(/\s+/)[0];

  return (
    <main className="admin-dashboard student-dashboard">
      <header className="admin-topbar">
        <Link aria-label="Dashboard siswa SMK Nan Jaya" className="admin-brand" href="/siswa">
          <SchoolMark />
          <span>SPMB SISWA<small>SMK NAN JAYA</small></span>
        </Link>
        <form action="/siswa/pengumuman" className="admin-search" role="search">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
            <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.2 13.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          <input
            aria-label="Cari pengumuman"
            defaultValue={searchTerm}
            maxLength={100}
            name="q"
            placeholder="Cari pengumuman..."
            type="search"
          />
          <button type="submit">Cari</button>
        </form>
        <div className="admin-topbar-user">
          <span aria-hidden="true" className="admin-topbar-avatar">{firstName.charAt(0).toUpperCase()}</span>
          <span className="admin-topbar-name">{firstName}<small>Siswa</small></span>
          <StudentLogoutButton />
        </div>
      </header>
      <div className="admin-dashboard-layout">
        <AdminSidebar
          admin={student}
          basePath="/siswa"
          currentSection={currentSection}
          items={studentNavigation}
          roleLabel="Siswa"
        />
        {children}
      </div>
    </main>
  );
}
