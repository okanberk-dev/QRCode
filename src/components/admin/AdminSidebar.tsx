'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    // Basic trick: delete cookie via JS by setting it to past date.
    // In a real app we'd have a logout endpoint.
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/admin';
  };

  return (
    <div className="w-full md:w-64 bg-white border-b md:border-r md:border-b-0 border-gray-200 p-4 flex flex-col justify-between">
      <div>
        <div className="mb-8 p-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
            Mamma's Admin
          </h1>
        </div>
        
        <nav className="space-y-2">
          <a
            href="/admin/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/admin/dashboard'
                ? 'bg-red-50 text-red-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </a>
          
          <div className="flex justify-between items-center px-4 py-3 text-gray-400 cursor-not-allowed">
            <div className="flex items-center gap-3">
              <Settings size={20} />
              Ayarlar
            </div>
            <span className="text-[10px] bg-gray-100 py-1 px-2 rounded-full">Yakında</span>
          </div>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full mt-auto"
      >
        <LogOut size={20} />
        Çıkış Yap
      </button>
    </div>
  );
}
