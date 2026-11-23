import { LabNav } from "@/components/lab/lab-nav";

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LabNav />
    </>
  );
}
