import Menu from "@/components/MenuBar";
export default async function MainLayout({ children }: { children: React.ReactNode }) {

  return (
    <>
      {children}
      <div className="absolute bottom-0 left-0 z-30 fixed">
        <Menu />
      </div>
    </>
  );
}
