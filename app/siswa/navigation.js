export const studentNavigation = [
  { label: "Dashboard", icon: "▦", section: "dashboard" },
  { label: "Pendaftaran", icon: "▤", section: "pendaftaran" },
  { label: "Ujian", icon: "✓", section: "ujian" },
  { label: "Pengumuman", icon: "◷", section: "pengumuman" },
  { label: "Profil", icon: "♙", section: "profil" },
];

export const applicationStatusLabels = {
  pending_verification: "Menunggu verifikasi",
  verified: "Terverifikasi",
  passed: "Lolos seleksi",
  not_passed: "Tidak lolos",
};

export function formatStudentDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
