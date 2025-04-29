import PaperViewer from "@/components/home/PaperViewer";

const draftKey = process.env.NEXT_PUBLIC_MICROCMS_DRAFT_KEY

type Profile = {
  createdAt: string;
  updatedAt: string;
  name: string;
  birthday: string;
  affiliation: string;
  so_far: string;
  title: string;
  outline: string;
};

const getProfile = async (): Promise<Profile> => {
  const res = await fetch(`https://rttd.microcms.io/api/v1/profile?draftKey=${draftKey}`, {
    headers: {
      'X-MICROCMS-API-KEY': process.env.NEXT_PUBLIC_MICROCMS_API_KEY || "",
    },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch profile');
  }
  return res.json() as Promise<Profile>;
}

function getAge(birthday: string): number {
  const today = new Date();
  const birth = new Date(new Date(birthday).getTime() + 9 * 60 * 60 * 1000);
  return today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
}

export default async function Home() {
  const profile = await getProfile()
  return (
    <div className="w-full h-full bg-white text-black">
      <div className="text-3xl font-bold text-gray-600 w-full py-20 text-center underline">{profile.title}</div>
      <div className="w-full p-8 flex justify-around">
        <section className="mb-12 w-1/3">
          <div className="text-2xl font-bold mb-4">プロフィール</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b">項目</th>
                  <th className="py-2 px-4 border-b">データ</th>
                </tr>
              </thead>
            <tbody>
              <tr className="border-t">
                <td className="py-2 px-4 border-b">名前</td>
                <td className="py-2 px-4 border-b">{profile.name}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-4 border-b">年齢</td>
                <td className="py-2 px-4 border-b">{getAge(profile.birthday)}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-4 border-b">所属</td>
                <td className="py-2 px-4 border-b">{profile.affiliation}</td>
              </tr>
              <tr className="border-t">
                <td className="py-2 px-4 border-b text-sm">これまでの経歴</td>
                <td className="py-2 px-4 border-b">{profile.so_far}</td>
              </tr>
            </tbody>
          </table>
        </div>
        </section>
        <section className="w-1/3">
          <div>
            <h2 className="font-bold">概要</h2>
            <div>{profile.outline}</div>
          </div>
          <PaperViewer thesisUrl="/thesis.pdf" slideUrl="/slide.pdf" />
        </section>
      </div>
    </div>
  );
}
