
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/contexts/i18n-context"; // Import useI18n
import { useEffect, useState } from "react";

export default function LandingPage() {
  const { t } = useI18n();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center font-bold text-xl text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6 text-primary"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            {t("landingPage.headerTitle")}
          </Link>
          <nav className="ml-auto flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> {t("landingPage.loginButton")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/register">
                <UserPlus className="mr-2 h-4 w-4" /> {t("landingPage.signUpButton")}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                    {t("landingPage.heroTitle")}
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    {t("landingPage.heroSubtitle")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/register">
                      {t("landingPage.heroCtaButton")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://placehold.co/600x400.png"
                width={600}
                height={400}
                alt="TaxWise Assistant Interface"
                data-ai-hint="financial planning tax"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-2xl"
              />
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">{t("landingPage.featuresSectionTag")}</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">{t("landingPage.featuresTitle")}</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t("landingPage.featuresSubtitle")}
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none pt-12">
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-md inline-block mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 18H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.07.34L15 6H6"/><path d="M15 18H9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z"/><path d="M19 22V10a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v12"/></svg>
                  </div>
                  <CardTitle>{t("landingPage.feature1Title")}</CardTitle>
                  <CardDescription>{t("landingPage.feature1Desc")}</CardDescription>
                </CardHeader>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="p-2 bg-primary/10 rounded-md inline-block mb-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3-3 3 3"/></svg>
                  </div>
                  <CardTitle>{t("landingPage.feature2Title")}</CardTitle>
                  <CardDescription>{t("landingPage.feature2Desc")}</CardDescription>
                </CardHeader>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                   <div className="p-2 bg-primary/10 rounded-md inline-block mb-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M22 10v6M2 10v6M12 2v20M20.34 17.2a8.05 8.05 0 0 0-8.34-14.4"/><path d="M3.66 6.8a8.05 8.05 0 0 0 8.34 14.4"/></svg>
                  </div>
                  <CardTitle>{t("landingPage.feature3Title")}</CardTitle>
                  <CardDescription>{t("landingPage.feature3Desc")}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hidden h-6 w-6 md:inline text-primary"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              {t("landingPage.footerBuiltBy")}
            </p>
          </div>
          <p className="text-center text-sm text-muted-foreground md:text-right">
            {t("landingPage.footerRights", { year: currentYear })}
          </p>
        </div>
      </footer>
    </div>
  );
}
