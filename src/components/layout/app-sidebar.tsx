
"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
} from "@/components/ui/sidebar";
import { AppSidebarNav } from "./app-sidebar-nav";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/contexts/i18n-context";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function AppSidebar() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();


  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: t("userNav.logoutSuccessTitle"), description: t("userNav.logoutSuccessDescription") });
      router.push("/login");
    } catch (error) {
      console.error("Logout error from sidebar:", error);
      toast({ title: t("userNav.logoutErrorTitle"), description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 justify-center items-center">
        {/* Logo or App Name - visible when expanded */}
         <Link href="/dashboard" className="flex items-center font-bold text-xl text-sidebar-foreground group-data-[state=collapsed]:hidden">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6 text-sidebar-primary"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          TaxWise
        </Link>
         {/* Icon - visible when collapsed */}
        <Link href="/dashboard" className="hidden items-center group-data-[state=collapsed]:flex">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-sidebar-primary"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <AppSidebarNav />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2">
          <LogOut className="h-5 w-5 group-data-[state=expanded]:mr-2" />
          <span className="group-data-[state=collapsed]:hidden">{t('sidebar.logout')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
