import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";
import SchoolMark from "@/app/components/SchoolMark";
import {
  findStudentSession,
  STUDENT_SESSION_COOKIE,
} from "@/app/lib/student-session";

export const metadata = {
  title: "Profil Pengguna | SMK Nan Jaya",
  description: "Profil akun pengguna SPMB SMK Nan Jaya.",
};

export default async function UserProfilePage() {
  const cookieStore = await cookies();
  const student = await findStudentSession(cookieStore.get(STUDENT_SESSION_COOKIE)?.value);

  if (!student) redirect("/");

  return (
    <main className="user-profile-page">
      <header className="principal-dashboard-header">
        <Link className="principal-dashboard-brand" href="/beranda">
          <SchoolMark />
          <span>SMK NAN JAYA<small>PORTAL SPMB ONLINE</small></span>
        </Link>
        <LogoutButton />
      </header>
      <div className="user-profile-content">
        <Link className="user-profile-back" href="/beranda">
          <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
            <path d="m11.5 4.5-5.5 5.5 5.5 5.5M6.5 10h11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
          </svg>
          Kembali ke beranda
        </Link>

        <section aria-labelledby="user-profile-title" className="user-profile-card">
          <div className="user-profile-banner">
            <Image
              alt="Murid SMK Nan Jaya dari program Bisnis Manajemen"
              className="user-profile-banner-image"
              fill
              priority
              sizes="(max-width: 800px) calc(100vw - 34px), 760px"
              src="/images/siswa-bisnis-nan-jaya.png"
            />
            <span aria-hidden="true" className="user-profile-banner-overlay" />
            <span className="user-profile-banner-orb user-profile-banner-orb-one" />
            <span className="user-profile-banner-orb user-profile-banner-orb-two" />
            <span className="user-profile-banner-label">AKUN SPMB</span>
          </div>

          <div className="user-profile-intro">
            <div aria-hidden="true" className="user-profile-avatar">
              {student.full_name.trim().charAt(0).toUpperCase()}
            </div>
            <span className="user-profile-role">
              <span />
              Akun calon murid
            </span>
            <h1 id="user-profile-title">{student.full_name}</h1>
            <p>Profil pengguna</p>
          </div>

          <div className="user-profile-section">
            <div className="user-profile-section-heading">
              <div>
                <span className="user-profile-eyebrow">INFORMASI AKUN</span>
                <h2>Detail profil</h2>
              </div>
              <span aria-hidden="true" className="user-profile-shield">
                <svg fill="none" viewBox="0 0 20 20">
                  <path d="M10 2.5 4 5v4.6c0 3.7 2.5 6.4 6 7.9 3.5-1.5 6-4.2 6-7.9V5l-6-2.5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
                  <path d="m7.5 9.8 1.7 1.7 3.5-3.7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
                </svg>
              </span>
            </div>

            <dl className="user-profile-details">
              <div>
                <dt><span className="user-profile-detail-icon">N</span>Nama lengkap</dt>
                <dd>{student.full_name}</dd>
              </div>
              <div>
                <dt><span className="user-profile-detail-icon">@</span>Email</dt>
                <dd>{student.email}</dd>
              </div>
              {student.nisn && (
                <div>
                  <dt><span className="user-profile-detail-icon">#</span>NISN</dt>
                  <dd>{student.nisn}</dd>
                </div>
              )}
              {student.phone && (
                <div>
                  <dt><span className="user-profile-detail-icon">+</span>Nomor WhatsApp</dt>
                  <dd>{student.phone}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="user-profile-card-footer">
            <span>Informasi akun Anda tersimpan dengan aman.</span>
            <Link className="user-profile-portal-link" href="/beranda">
              Kembali ke portal
              <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
                <path d="M3.5 10h13m-5.5-5.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
              </svg>
            </Link>
          </div>
        </section>
        <p className="user-profile-footnote">SPMB Online <span>·</span> SMK Nan Jaya</p>
      </div>
    </main>
  );
}
