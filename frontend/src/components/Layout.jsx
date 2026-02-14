import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-slate-900 text-slate-400 text-center text-sm py-4">
        &copy; {new Date().getFullYear()} GraphFit &mdash; Extract. Fit. Visualize.
      </footer>
    </div>
  );
}
