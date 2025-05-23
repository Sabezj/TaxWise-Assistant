
"use client";

import { UserNav } from "@/components/layout/user-nav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvailableCurrencies, useI18n } from "@/contexts/i18n-context";

export function AppHeader() {
  const isMobile = useIsMobile();
  const { language, setLanguage, t, currency: currentCurrency, setCurrency: setCurrentCurrency } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {isMobile && <SidebarTrigger className="mr-2" />}
        <Link href="/dashboard" className="flex items-center font-bold text-xl text-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          TaxWise
        </Link>
        <div className="ml-auto flex items-center space-x-4">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage("en")} disabled={language === "en"}>
                {t('english')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("ru")} disabled={language === "ru"}>
                {t('russian')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {currentCurrency}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.values(AvailableCurrencies).map((currencyValue) => (
                <DropdownMenuItem key={currencyValue} onClick={() => setCurrentCurrency(currencyValue)} disabled={currentCurrency === currencyValue}>
                  {currencyValue}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
