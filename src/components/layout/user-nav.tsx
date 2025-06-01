
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/i18n-context";

export function UserNav() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({ title: t("userNav.logoutSuccessTitle"), description: t("userNav.logoutSuccessDescription") });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: t("userNav.logoutErrorTitle"), description: (error as Error).message, variant: "destructive" });
    }
  };

  if (!user) {

    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}`} alt={user.displayName || user.email || "User"} data-ai-hint="user profile" />
            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || t("userNav.anonymousUser")}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email || t("userNav.noEmail")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile">
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t("userNav.profileLink")}</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
             <Link href="/dashboard/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("userNav.settingsLink")}</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("userNav.logoutButton")}</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
