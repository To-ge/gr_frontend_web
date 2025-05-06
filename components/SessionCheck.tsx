'use client'

import { apiHost } from "@/lib/environments";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SessionCheck() {
    const router = useRouter()
    useEffect(() => {
        const checkSession = async () => {
          const res = await fetch(`${apiHost}/api/v1/auth/session-check`, {
            credentials: 'include',
            cache: 'no-store',
          });
    
          if (!res.ok) {
            router.push('/login');
          }
        };
    
        checkSession();
      }, [router]);
    return <></>
}