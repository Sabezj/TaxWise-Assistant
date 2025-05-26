
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, type User } from "firebase/auth"; // Import User type
import { auth } from "@/lib/firebase";
import { logUserAction } from "@/lib/actions"; // Import logUserAction

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
import { LogIn } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";

const formSchema = (t: Function) => z.object({
  email: z.string().email({ message: t("registerForm.validation.emailInvalid") }), 
  password: z.string().min(6, { message: t("registerForm.validation.passwordMin") }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const currentFormSchema = formSchema(t);

  const form = useForm<z.infer<typeof currentFormSchema>>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof currentFormSchema>) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      toast({
        title: t("loginForm.successToastTitle"),
        description: t("loginForm.successToastDescription"), 
      });

      // Log login action
      if (user) {
        await logUserAction(
          user.uid,
          user.displayName || user.email || "Unknown User",
          "Login Success"
        );
      }

      // Simulate sending an email via API route
      try {
        const emailResponse = await fetch('/api/send-login-email', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: values.email }) 
        });
        const emailResult = await emailResponse.json();
        if (emailResult.success) {
          // console.log("Login email simulation API call successful:", emailResult.message);
        } else {
          console.error("Login email simulation API call failed:", emailResult.message);
        }
      } catch (error) {
        console.error("Failed to call send-login-email API route:", error);
      }

      router.push("/dashboard");

    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessageKey = "loginForm.error.default";
      if (error.code) {
         switch(error.code) {
            case "auth/user-not-found":
            case "auth/wrong-password":
            case "auth/invalid-credential": // Added this case
                errorMessageKey = "loginForm.error.invalidCredentials";
                break;
            case "auth/too-many-requests":
                errorMessageKey = "loginForm.error.tooManyRequests";
                break;
            case "auth/network-request-failed":
                 errorMessageKey = "loginForm.error.networkError";
                break;
            case "auth/invalid-email":
                errorMessageKey = "loginForm.error.authInvalidEmail";
                break;
            case "auth/user-disabled":
                errorMessageKey = "loginForm.error.authUserDisabled";
                break;
         }
      }
      toast({
        title: t("loginForm.error.title"),
        description: t(errorMessageKey),
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("loginForm.title")}</CardTitle>
        <CardDescription>{t("loginForm.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("loginForm.emailLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("loginForm.emailPlaceholder")} {...field} />
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
                  <FormLabel>{t("loginForm.passwordLabel")}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t("loginForm.signingInButton") : <> <LogIn className="mr-2 h-4 w-4" /> {t("loginForm.signInButton")} </>}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Link href="/forgot-password"> 
          <Button variant="link" className="text-sm">{t("loginForm.forgotPasswordLink")}</Button>
        </Link>
        <p className="text-sm text-muted-foreground">
          {t("loginForm.noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t("loginForm.signUpLink")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
