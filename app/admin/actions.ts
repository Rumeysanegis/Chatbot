"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "nr_admin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 saat

export async function loginAction(formData: FormData) {
  const pw = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    console.error("[admin] ADMIN_PASSWORD is not set");
    redirect("/admin?error=server");
  }

  if (pw !== expected) {
    redirect("/admin?error=invalid");
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/admin",
  });
  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/admin");
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === "1";
}
