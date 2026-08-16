import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0d1117] text-slate-200 font-mono">
      <h2 className="text-xl font-bold text-indigo-400">404 // NODE NOT FOUND</h2>
      <p className="text-xs text-slate-400 mt-2">Requested ontology coordinate is unavailable.</p>
      <Link href="/" className="mt-4 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs text-white">
        Return to Root Command
      </Link>
    </div>
  );
}

