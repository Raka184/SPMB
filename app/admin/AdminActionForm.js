"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminActionForm({
  resource,
  action,
  itemId,
  fields,
  submitLabel,
  className = "",
  confirmMessage,
  id,
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const form = event.currentTarget;
    setError("");
    setNotice("");
    setSubmitting(true);
    const formData = new FormData(form);
    const payload = Object.fromEntries(
      fields.map((field) => [
        field.name,
        field.type === "checkbox"
          ? formData.get(field.name) === "on"
          : formData.get(field.name),
      ]),
    );

    try {
      const response = await fetch(`/api/admin/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: itemId, payload }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message || "Perubahan tidak dapat disimpan.");
        setSubmitting(false);
        return;
      }

      if (action === "create") form.reset();
      setNotice(result.message || "Perubahan berhasil disimpan.");
      setSubmitting(false);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba lagi.");
      setSubmitting(false);
    }
  }

  return (
    <form className={`admin-action-form ${className}`} id={id} onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label className={`admin-form-field${field.type === "checkbox" ? " admin-checkbox-field" : ""}`} key={field.name}>
          {field.type === "checkbox" ? (
            <>
              <input
                defaultChecked={field.value === true}
                name={field.name}
                type="checkbox"
              />
              <span>{field.label}</span>
            </>
          ) : (
            <>
              <span>{field.label}</span>
              {field.type === "select" ? (
                <select
                  defaultValue={field.value ?? ""}
                  name={field.name}
                  required={field.required}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  defaultValue={field.value ?? ""}
                  maxLength={field.maxLength}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={field.rows || 3}
                />
              ) : (
                <input
                  defaultValue={field.value ?? ""}
                  max={field.max}
                  maxLength={field.maxLength}
                  min={field.min}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  step={field.step}
                  type={field.type || "text"}
                />
              )}
            </>
          )}
        </label>
      ))}
      {error && <p className="admin-form-error" role="alert">{error}</p>}
      {notice && <p className="admin-form-success" role="status">{notice}</p>}
      <button className="admin-action-button" disabled={submitting} type="submit">
        {submitting ? "Menyimpan..." : submitLabel}
      </button>
    </form>
  );
}
