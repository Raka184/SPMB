"use client";

export default function PrintReportButton() {
  return (
    <button className="admin-action-button" onClick={() => window.print()} type="button">
      Cetak / Simpan PDF
    </button>
  );
}
