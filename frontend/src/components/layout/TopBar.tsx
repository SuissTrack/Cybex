'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Briefcase, FileCheck, User } from 'lucide-react';

const PAGE_TITLES: Record<string, { label: string; icon: React.ElementType }> = {
  '/dashboard': { label: 'Tableau de bord', icon: LayoutDashboard },
  '/jobs': { label: 'Offres d\'emploi', icon: Briefcase },
  '/applications': { label: 'Mes candidatures', icon: FileCheck },
  '/profile': { label: 'Mon profil', icon: User },
};

export function TopBar() {
  const pathname = usePathname();
  const current = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1];

  return (
    <header className="h-14 border-b border-border flex items-center px-6 bg-card/50 backdrop-blur-sm flex-shrink-0">
      {current && (
        <div className="flex items-center gap-2">
          <current.icon className="w-4 h-4 text-muted-foreground" />
          <h1 className="font-semibold text-sm">{current.label}</h1>
        </div>
      )}
    </header>
  );
}
