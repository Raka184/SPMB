"use client";

import { useEffect, useRef, useState } from "react";
import SchoolMark from "@/app/components/SchoolMark";

export default function AuthLoadingScreen({ mode, onClose, result }) {
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const startedAtRef = useRef(0);
  const isRegistration = mode === "register";
  const loadingSteps = isRegistration
    ? [
        "Memvalidasi data",
        "Menyimpan akun ke database",
        "Menyelesaikan pendaftaran",
      ]
    : [
        "Memvalidasi formulir",
        "Memverifikasi akun di database",
        "Menyelesaikan login",
      ];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    startedAtRef.current = Date.now();
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const stepTimers = [
      window.setTimeout(() => setStep(1), 700),
      window.setTimeout(() => setStep(2), 1450),
    ];

    return () => {
      stepTimers.forEach(window.clearTimeout);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!result) return undefined;

    const minimumLoadingTime = 1700;
    const remainingTime = Math.max(
      0,
      minimumLoadingTime - (Date.now() - startedAtRef.current),
    );
    const completionTimer = window.setTimeout(
      () => setComplete(true),
      remainingTime,
    );

    return () => window.clearTimeout(completionTimer);
  }, [result]);

  useEffect(() => {
    if (complete) closeButtonRef.current?.focus();
  }, [complete]);

  function handleDialogKeyDown(event) {
    if (event.key === "Escape" && complete) {
      onClose();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      if (complete) closeButtonRef.current?.focus();
      else dialogRef.current?.focus();
    }
  }

  return (
    <div className="auth-loading-overlay">
      <section
        aria-labelledby="auth-loading-title"
        aria-modal="true"
        className={`auth-loading-card${complete ? " is-complete" : ""}${complete && result?.success ? " is-success" : ""}`}
        id="auth-loading-dialog"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div aria-hidden="true" className="loading-decoration">
          <span className="loading-orbit loading-orbit-outer" />
          <span className="loading-orbit loading-orbit-inner" />
          <span className="loading-orbit-dot" />
          <span className="loading-glow" />
          <span className="loading-emblem">
            {complete && result?.success ? (
              <svg fill="none" viewBox="0 0 24 24">
                <path
                  d="m6 12.5 4 4 8-9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            ) : complete ? (
              <svg fill="none" viewBox="0 0 24 24">
                <path
                  d="m7 7 10 10M17 7 7 17"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            ) : (
              <SchoolMark />
            )}
          </span>
        </div>

        <div className="loading-brand">
          <SchoolMark />
          <span>SPMB <small>SMK NAN JAYA</small></span>
        </div>

        <span
          className={`loading-status-badge${complete ? result?.success ? " status-success" : " status-unavailable" : ""}`}
        >
          <span />
          {complete
            ? result?.success
              ? isRegistration
                ? "AKUN BERHASIL DIBUAT"
                : "LOGIN BERHASIL"
              : isRegistration
                ? "PENDAFTARAN GAGAL"
                : "LOGIN GAGAL"
            : "PROSES AUTENTIKASI"}
        </span>

        <h2 aria-atomic="true" aria-live="polite" id="auth-loading-title">
          {complete
            ? result?.title
            : isRegistration
              ? "Menyiapkan pendaftaran"
              : "Memverifikasi akun"}
        </h2>
        <p className="loading-description">
          {complete
            ? result?.message
            : isRegistration
              ? "Kami sedang menyiapkan permintaan pembuatan akun Anda."
              : "Kami sedang menyiapkan permintaan masuk Anda."}
        </p>

        {!complete ? (
          <>
            <div
              aria-label="Memproses permintaan"
              className="loading-progress"
              role="progressbar"
            >
              <span />
            </div>
            <ol aria-label="Tahapan proses" className="loading-steps">
              {loadingSteps.map((label, index) => (
                <li
                  className={index <= step ? "step-active" : ""}
                  key={label}
                >
                  <span className="step-indicator">
                    {index < step ? (
                      <svg aria-hidden="true" fill="none" viewBox="0 0 12 12">
                        <path
                          d="m2.5 6 2.2 2.2 4.8-4.8"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                      </svg>
                    ) : index === step ? (
                      <span />
                    ) : null}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <button
            className="loading-close-button"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            {result?.success && isRegistration
              ? "Ke halaman masuk"
              : result?.success
                ? "Selesai"
                : "Kembali ke formulir"}
          </button>
        )}

        <div className="loading-card-footer">
          <svg aria-hidden="true" fill="none" viewBox="0 0 16 16">
            <path
              d="M8 1.8 13 4v3.4c0 3.1-2 5.5-5 6.8-3-1.3-5-3.7-5-6.8V4l5-2.2Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
            <path
              d="m5.8 7.8 1.4 1.4 3-3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.2"
            />
          </svg>
          <span>
            {complete
              ? result?.success
                ? isRegistration
                  ? "Akun tersimpan · Database SPMB"
                  : "Akun terverifikasi · Database SPMB"
                : "Data tidak tersimpan · SMK Nan Jaya"
              : "Menghubungkan ke database · SMK Nan Jaya"}
          </span>
          <span className="loading-session">SPMB 2026</span>
        </div>
      </section>
    </div>
  );
}
