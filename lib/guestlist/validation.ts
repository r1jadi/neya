import type { SubmitGuestlistResult } from "@/types/guestlist";

const PHONE_MIN = 8;
const PHONE_MAX = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.slice(0, PHONE_MAX);
}

export function isValidPhone(phone: string): boolean {
  return phone.length >= PHONE_MIN && phone.length <= PHONE_MAX && /^\d+$/.test(phone);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 200;
}

export function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export type ParsedGuestlistForm = {
  eventId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string | null;
  groupSize: number;
  notes: string | null;
};

export function parseGuestlistFormData(formData: FormData): ParsedGuestlistForm | SubmitGuestlistResult {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const firstName = String(formData.get("first_name") ?? "").trim().slice(0, 80);
  const lastName = String(formData.get("last_name") ?? "").trim().slice(0, 80);
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const phone = normalizePhone(phoneRaw);
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw ? emailRaw.slice(0, 200) : null;
  const groupSizeRaw = Number(formData.get("group_size") ?? 1);
  const groupSize = Number.isFinite(groupSizeRaw) ? Math.min(20, Math.max(1, Math.round(groupSizeRaw))) : 1;
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const notes = notesRaw ? notesRaw.slice(0, 500) : null;

  if (!eventId) {
    return { success: false, error: "Event is required.", code: "invalid" };
  }
  if (!firstName || !lastName) {
    return { success: false, error: "First and last name are required.", code: "invalid" };
  }
  if (!isValidPhone(phone)) {
    return {
      success: false,
      error: "Enter a valid phone number (8–15 digits, country code optional).",
      code: "invalid",
    };
  }
  if (email && !isValidEmail(email)) {
    return { success: false, error: "Enter a valid email address or leave it blank.", code: "invalid" };
  }

  return {
    eventId,
    firstName,
    lastName,
    fullName: buildFullName(firstName, lastName),
    phone,
    email,
    groupSize,
    notes,
  };
}
