'use client';

import { useState } from 'react';
import { Sidebar as ShadcnSidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, Home, LibraryBig, LogOut, MessageSquare, MonitorPlay, School, User, Users, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/lib/useUser';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const { data: user } = useUser();

  const role = user?.role;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }); // Optional: Call a logout endpoint if you have one
    localStorage.removeItem('authToken'); // Clear token
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/auth/signin'; // Redirect
  };

  return (
    <ShadcnSidebar collapsible="icon" className="fixed left-0 top-0 h-screen border-r" variant="floating">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {role === 'teacher' && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/institutes">
                        <School className="mr-2 h-4 w-4" />
                        <span>Institutes</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/classes">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Classes</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/students">
                        <Users className="mr-2 h-4 w-4" /> {/* Add Users icon from lucide */}
                        <span>Students</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/papers">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Papers</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/mcq-manager">
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        <span>Online MCQs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/reports">
                        <LibraryBig className="mr-2 h-4 w-4" />
                        <span>Reports</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                </>

              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/recordings">
                    <MonitorPlay className="mr-2 h-4 w-4" />
                    <span>Recordings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/chat">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Messages</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {role === 'student' && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/exam-list">
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        <span>Online Exams</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href={`/profile/${user?.id}`}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4 cursor-pointer" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <Button
        variant="outline"
        className="absolute top-4 right-4 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        Toggle
      </Button>
    </ShadcnSidebar>
  );
}