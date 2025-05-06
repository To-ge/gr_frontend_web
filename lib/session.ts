import { apiHost } from "./environments";

// In case 'use client'
export const checkSessionExpiration = async (): Promise<boolean> => {
  const res = await fetch(`${apiHost}/api/v1/auth/session-check`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    return false
  }
  return true
}
