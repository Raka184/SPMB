import Link from "next/link";

const items = [
  { label: "Dashboard", icon: "▦", section: "dashboard" },
  { label: "Data Pendaftar", icon: "♙", section: "pendaftar" },
  { label: "Soal Ujian", icon: "✓", section: "ujian" },
  { label: "Seleksi", icon: "✓", section: "seleksi" },
  { label: "Pengumuman", icon: "◷", section: "pengumuman" },
  { label: "Jurusan", icon: "◇", section: "jurusan" },
  { label: "Laporan", icon: "▤", section: "laporan" },
  { label: "Pengaturan", icon: "⚙", section: "pengaturan" },
];

export default function AdminSidebar({
  admin,
  currentSection,
  basePath = "/admin",
  roleLabel = "Administrator",
  items: navigationItems = items,
}) {
  const visibleItems = basePath === "/admin"
    ? navigationItems
    : navigationItems.filter((item) => item.section !== "ujian");

  return (
    <aside aria-label={`Navigasi ${roleLabel.toLowerCase()}`} className="admin-sidebar">
      <span className="admin-sidebar-label">MENU UTAMA</span>
      {visibleItems.map((item) => (
        <Link
          aria-current={item.section === currentSection ? "page" : undefined}
          className={`admin-nav-link${item.section === currentSection ? " is-active" : ""}`}
          href={item.href || (item.section === "dashboard" ? basePath : `${basePath}/${item.section}`)}
          key={item.section}
        >
          <span aria-hidden="true">{item.icon}</span>{item.label}
        </Link>
      ))}
      <div className="admin-sidebar-account">
        <span aria-hidden="true" className="admin-avatar">
          {admin.full_name.trim().charAt(0).toUpperCase()}
        </span>
        <span>{admin.full_name}<small>{roleLabel} · {admin.email}</small></span>
      </div>
    </aside>
  );
}
