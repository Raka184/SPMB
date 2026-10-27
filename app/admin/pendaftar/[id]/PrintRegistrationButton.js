"use client";

export default function PrintRegistrationButton() {
  return (
    <button className="admin-detail-print" onClick={() => window.print()} type="button">
      <span aria-hidden="true">▣</span> Cetak Pendaftaran
    </button>
  );
}
