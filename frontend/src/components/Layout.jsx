import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-slate-800">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="relative overflow-hidden border-t border-slate-200/60">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-700" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21l3-3m0 0l3 3m-3-3V3m4 14l3-3m-3 3L11 11" />
                </svg>
              </div>
              <span className="text-white font-semibold text-sm">GraphFit</span>
            </div>
            <p className="text-indigo-200 text-sm">
              Extract &middot; Fit &middot; Visualize
            </p>
            <p className="text-indigo-300/70 text-xs">
              &copy; {new Date().getFullYear()} GraphFit
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
