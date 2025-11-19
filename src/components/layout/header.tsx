'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:h-16 sm:px-6">
      <SidebarTrigger className="sm:hidden" />
      {/* Page Title or other header content can go here */}
    </header>
  );
}
