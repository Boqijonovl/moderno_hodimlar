import EmployeeDashboard from '@/components/EmployeeDashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-blue-600 text-white p-6 shadow-md rounded-b-3xl">
        <h1 className="text-2xl font-bold tracking-tight">Moderno Bot</h1>
        <p className="text-blue-100 mt-1">Mebel Do'koni Boshqaruvi</p>
      </div>
      <div className="mt-[-20px] relative z-10">
        <EmployeeDashboard />
      </div>
    </main>
  );
}
