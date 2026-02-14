import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight hover:text-blue-400 transition-colors">
          GraphFit
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          <Link to="/" className="hover:text-blue-400 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </nav>
  );
}
