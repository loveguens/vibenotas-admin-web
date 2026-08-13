import { Outlet } from "react-router-dom";
import { useState } from "react";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";

type AdminLayoutProps = {
  role: "admin" | "superadmin";
};

export default function AdminLayout({ role }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080E1D] text-white lg:flex">
      <Sidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <Topbar
          role={role}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}