
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, History, Users, ShieldAlert, UserCircle, Settings, BarChart3, ListChecks, UserPlus as CreateGroupIcon } from "lucide-react"; // Renamed UserPlus to avoid conflict
import { useI18n } from "@/contexts/i18n-context";
import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; // Added setDoc, updateDoc
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, UserRole } from "@/types";
import { Loader2 } from "lucide-react";


interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  tooltipKey?: string;
  roles?: UserRole[];
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", labelKey: "sidebar.dashboard", icon: LayoutDashboard, tooltipKey: "sidebar.dashboardTooltip" },
  { href: "/dashboard/analytics", labelKey: "sidebar.analytics", icon: BarChart3, tooltipKey: "sidebar.analyticsTooltip" },
  { href: "/dashboard/transactions", labelKey: "sidebar.transactions", icon: ListChecks, tooltipKey: "sidebar.transactionsTooltip" },
  { href: "/dashboard/history", labelKey: "sidebar.taxHistory", icon: History, tooltipKey: "sidebar.taxHistoryTooltip" },
  { href: "/dashboard/profile", labelKey: "sidebar.profile", icon: UserCircle, tooltipKey: "sidebar.profileTooltip" },
  { href: "/dashboard/settings", labelKey: "sidebar.settings", icon: Settings, tooltipKey: "sidebar.settingsTooltip" },
];

const adminNavItems: NavItem[] = [
    { href: "/dashboard/admin/users", labelKey: "sidebar.manageUsers", icon: Users, tooltipKey: "sidebar.manageUsersTooltip", roles: ['admin', 'superadmin'] },
    { href: "/dashboard/admin/logs", labelKey: "sidebar.auditLogs", icon: ShieldAlert, tooltipKey: "sidebar.auditLogsTooltip", roles: ['admin', 'superadmin'] },
];

const SUPERADMIN_EMAIL = "sabezj1@gmail.com";

interface UserRoleStatus {
  role: UserRole | null;
  isLoading: boolean;
  fetchUserRole: () => void; 
}

const useUserRoleStatus = (): UserRoleStatus => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = useCallback(async (currentUser: FirebaseUser | null) => {
    setIsLoading(true);
    if (currentUser) {
      if (currentUser.email === SUPERADMIN_EMAIL) {
        setRole('superadmin');
        setIsLoading(false);
        // Ensure Firestore profile is also updated if needed, but UI role is immediate
        try {
            const userProfileRef = doc(db, "userProfiles", currentUser.uid);
            const docSnap = await getDoc(userProfileRef);
            if (docSnap.exists() && docSnap.data().role !== 'superadmin') {
                await updateDoc(userProfileRef, { role: 'superadmin' });
            } else if (!docSnap.exists()) {
                // This case should ideally be handled by registration, but as a fallback:
                await setDoc(userProfileRef, {
                    id: currentUser.uid,
                    name: currentUser.displayName || "Super Admin",
                    email: currentUser.email,
                    avatarUrl: currentUser.photoURL || `https://placehold.co/100x100.png?text=${currentUser.email?.charAt(0).toUpperCase() || 'S'}`,
                    role: 'superadmin',
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error("Error ensuring superadmin role in Firestore:", error);
        }
        return; 
      }
      // For other users, fetch role from Firestore
      try {
        const userProfileRef = doc(db, "userProfiles", currentUser.uid);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const userProfile = docSnap.data() as UserProfile;
          setRole(userProfile.role || 'user');
        } else {
          console.warn(`User profile not found in Firestore for UID: ${currentUser.uid}. Defaulting to 'user' role.`);
          setRole('user'); // Default if profile doesn't exist yet
        }
      } catch (error) {
        console.error("Error fetching user profile for role check:", error);
        setRole('user'); // Default on error
      }
    } else {
      setRole(null);
    }
    setIsLoading(false);
  }, []);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((fbUser: FirebaseUser | null) => {
      fetchUserRole(fbUser);
    });
    return () => unsubscribe();
  }, [fetchUserRole]);

  const manualRefreshRole = useCallback(() => {
      if(auth.currentUser){
          fetchUserRole(auth.currentUser);
      }
  }, [fetchUserRole]);


  return { role, isLoading, fetchUserRole: manualRefreshRole };
};


export function AppSidebarNav() {
  const pathname = usePathname();
  const { role: currentUserRole, isLoading: isLoadingRole } = useUserRoleStatus();
  const { t } = useI18n();

  if (isLoadingRole) {
    return (
      <SidebarMenu>
        {[...Array(6)].map((_, i) => (
          <SidebarMenuItem key={`skel-${i}`}>
            <div className="h-8 w-full bg-sidebar-accent/30 rounded-md animate-pulse p-2 flex items-center">
                <div className="h-5 w-5 bg-sidebar-accent/50 rounded-md mr-2"></div>
                <div className="h-4 w-3/4 bg-sidebar-accent/50 rounded-md"></div>
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  const itemsToDisplay = [...mainNavItems];
  
  if (currentUserRole === 'admin' || currentUserRole === 'superadmin') {
    adminNavItems.forEach(item => {
        // Superadmin sees all admin items. Regular admin sees items defined for 'admin' role.
        if (item.roles?.includes(currentUserRole)) {
            itemsToDisplay.push(item);
        }
    });
  }


  return (
    <SidebarMenu>
      {itemsToDisplay.map((item) => {
        if (item.href === "/dashboard/groups/create" && currentUserRole === 'superadmin') {
            return null; // Superadmin does not see "Create Group" in sidebar
        }
        
        // Conditional rendering based on roles for admin items
        if (item.roles && !item.roles.includes(currentUserRole || 'user')) {
           return null; 
        }

        return (
            <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                tooltip={item.tooltipKey ? t(item.tooltipKey) : t(item.labelKey)}
                className={cn(
                    "justify-start",
                    (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                >
                <a>
                    <item.icon className="h-5 w-5" />
                    <span>{t(item.labelKey)}</span>
                </a>
                </SidebarMenuButton>
            </Link>
            </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
