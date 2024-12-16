import { useMemo } from "react"
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HomeIcon from '@mui/icons-material/Home';
import TimelineIcon from '@mui/icons-material/Timeline';
import Link from "next/link";

export default function Menu() {
    const pages = useMemo(()=>{
        return [
            {
                name: 'map',
                icon: <LocationOnIcon className="" />,
                link: '/map'
            },
            {
                name: 'home',
                icon: <HomeIcon className="" />,
                link: '/'
            },
            {
                name: 'graph',
                icon: <TimelineIcon className="" />,
                link: '/graph'
            },
        ]
    },[])
    return (
        <div className="bg-teal-500 w-screen h-48 p-2 flex justify-around items-start">
            {
                pages.map((p, i) => (
                    <Link key={i} href={p.link} className="flex flex-col items-center justify-center px-6 py-2 hover:bg-teal-700 rounded-md">
                        {p.icon}
                        <div className="text-xs">{p.name}</div>
                    </Link>
                ))
            }
        </div>
    )
}