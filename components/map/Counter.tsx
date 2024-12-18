export default function Counter({num}:{num: number}) {
    return (
        <div className="absolute z-30 top-3 right-16 bg-white min-w-20 px-2 flex justify-center items-center opacity-70 rounded-md text-gray-800 text-3xl font-black italic">
            {num}
        </div>
    )
}