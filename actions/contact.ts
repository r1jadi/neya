"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitContactMessage(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { error: "Please fill in all required fields." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    subject,
    message,
  });

  if (error) {
    console.error("[neya] submitContactMessage", error.message);
    return { error: "Could not send your message. Please try again later." };
  }

  return { success: true };
}
