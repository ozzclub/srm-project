'use client';

import { Menu, Home, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const routeLabels: Record<string, string> = {
  'dashboard': 'Dashboard',
  'movement-log': 'Movement Log',
  'material': 'Material',
  'users': 'Users',
  'documents': 'Documents',
};

export default function Header({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(Boolean);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition focus:ring-2 focus:ring-gray-500"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>

        <div className="flex-1 lg:ml-4 overflow-x-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            
            {pathSegments.map((segment, index) => {
              const isLast = index === pathSegments.length - 1;
              const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
              const label = routeLabels[segment] || segment.replace(/-/g, ' ');
              
              return (
                <span key={href} className="flex items-center gap-1">
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {isLast ? (
                    <span className="text-gray-900 font-medium capitalize whitespace-nowrap">
                      {label}
                    </span>
                  ) : (
                    <Link
                      href={href}
                      className="text-gray-600 hover:text-gray-900 transition capitalize whitespace-nowrap"
                    >
                      {label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
