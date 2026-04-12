'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Menu,
  X,
  LogOut,
  ClipboardList,
} from 'lucide-react';
import { getCurrentUser, removeAuthCookies } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Movement Log', href: '/movement-log', icon: FileText },
  { name: 'MTO', href: '/mto', icon: ClipboardList },
  { name: 'Material Katalog', href: '/material', icon: Package },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
];

export default function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  
  // Defer user reading to client-side only to prevent hydration mismatch
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    removeAuthCookies();
    logout();
    router.push('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Material Log</h1>
        <p className="text-sm text-gray-500 mt-1">Management System</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;

          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onMobileClose()}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition relative ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full"></div>
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 px-4">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition focus:ring-2 focus:ring-red-500"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-200 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">Menu</span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition focus:ring-2 focus:ring-gray-500"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        {sidebarContent}
      </div>
    </>
  );
}
