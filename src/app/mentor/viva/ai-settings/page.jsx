"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// AI Settings have moved to /admin/viva/ai-settings (Super Admin only)
export default function AISettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/viva/ai-settings");
  }, [router]);
  return null;
}
