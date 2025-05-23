
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile as updateFirebaseAuthProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@/types"; // Import UserRole

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

const formSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t("registerForm.validation.nameMin") }),
  email: z.string().email({ message: t("registerForm.validation.emailInvalid") }),
  password: z.string().min(6, { message: t("registerForm.validation.passwordMin") }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: t("registerForm.validation.passwordsDontMatch"),
  path: ["confirmPassword"],
});

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  const currentFormSchema = formSchema(t);

  const form = useForm<z.infer<typeof currentFormSchema>>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof currentFormSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Update Firebase Auth profile display name
      await updateFirebaseAuthProfile(user, { displayName: values.name });

      // Create a user profile document in Firestore
      const userProfileRef = doc(db, "userProfiles", user.uid);
      const userRoleToSet: UserRole = values.email === "sabezj1@gmail.com" ? 'superadmin' : 'user';

      await setDoc(userProfileRef, {
        id: user.uid, 
        name: values.name,
        email: user.email,
        avatarUrl: `https://placehold.co/100x100.png?text=${values.name.charAt(0).toUpperCase() || 'U'}`,
        role: userRoleToSet, 
        createdAt: new Date().toISOString(),
      });
      
      // Create default settings document in Firestore
      const userSettingsRef = doc(db, "userSettings", user.uid);
      await setDoc(userSettingsRef, {
        theme: "system",
        notificationsEnabled: true,
        displayCurrency: "USD",
        language: "en" 
      });

      toast({
        title: t("registerForm.successToastTitle"),
        description: t("registerForm.successToastDescription"),
      });
      router.push("/login");

    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessageKey = "registerForm.error.default";
      if (error.code === "auth/email-already-in-use") {
        errorMessageKey = "registerForm.error.emailAlreadyInUse";
      } else if (error.code === "auth/weak-password") {
        errorMessageKey = "registerForm.error.weakPassword";
      } else if (error.code === "auth/network-request-failed"){
        errorMessageKey = "registerForm.error.networkError";
      }
      toast({
        title: t("registerForm.error.title"),
        description: t(errorMessageKey),
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("registerForm.title")}</CardTitle>
        <CardDescription>{t("registerForm.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("registerForm.nameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("registerForm.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("registerForm.emailLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("registerForm.emailPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("registerForm.passwordLabel")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("registerForm.confirmPasswordLabel")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("registerForm.creatingAccountButton") : <><UserPlus className="mr-2 h-4 w-4" /> {t("registerForm.signUpButton")}</>}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("registerForm.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("registerForm.signInLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
