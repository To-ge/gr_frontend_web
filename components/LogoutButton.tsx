
'use client'

import { apiHost } from '@/lib/environments';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter()

    const handleClick = async () => {
        try {
            const res = await fetch(`${apiHost}/api/v1/auth/logout`, { credentials: 'include' });
            if (!res.ok) {
                alert('ログアウトに失敗しました')
                return
            }
            router.push('/login')
        } catch (error) {
            alert('ログアウトエラー')
        }
    }

    return (
        <div
            className='p-3 text-white bg-slate-200 hover:bg-slate-300 rounded-md pointer cursor-pointer'
            onClick={handleClick}
        >
            <LogoutIcon />
        </div>
    )
}