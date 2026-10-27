"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/principal/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message || "Logout tidak dapat diproses.");
        setSubmitting(false);
        return;
      }

      router.replace("/kepala-sekolah/login");
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <div className="principal-logout">
      {error && <p className="form-message" role="alert">{error}</p>}
      <button className="principal-logout-button" disabled={submitting} onClick={handleLogout} type="button">
        {submitting ? "Keluar..." : "Keluar"}
      </button>
    </div>
  );
}
