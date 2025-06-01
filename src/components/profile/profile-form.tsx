
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types";
import { Save, UserCircle, Mail, Lock, ShieldAlert } from "lucide-react";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/contexts/i18n-context";

const profileFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t("registerForm.validation.nameMin") || "Name must be at least 2 characters." }),
  email: z.string().email({ message: t("registerForm.validation.emailInvalid") || "Invalid email address." }),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && (!data.currentPassword || !data.confirmNewPassword)) {
    return false;
  }
  return true;
}, {
  message: t("profilePage.form.validation.currentPasswordRequired") || "Current password and confirmation are required to set a new password.",
  path: ["newPassword"],
}).refine(data => {
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: t("profilePage.form.validation.passwordsDontMatch") || "New passwords do not match.",
  path: ["confirmNewPassword"],
}).refine(data => {
  if (data.newPassword && data.newPassword.length < 6) {
    return false;
  }
  return true;
}, {
  message: t("profilePage.form.validation.newPasswordMin") || "New password must be at least 6 characters.",
  path: ["newPassword"],
});

type ProfileFormValues = z.infer<ReturnType<typeof profileFormSchema>>;

interface ProfileFormProps {
  user: UserProfile;
  onUpdateProfile: (data: Pick<ProfileFormValues, 'name' | 'email'>) => Promise<void>;
}

export function ProfileForm({ user, onUpdateProfile }: ProfileFormProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema(t)),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    let profileUpdated = false;
    let passwordChangedConceptually = false;

    try {
      if (data.name !== user.name || data.email !== user.email) {
        await onUpdateProfile({ name: data.name, email: data.email });
        profileUpdated = true;
      }

      if (data.newPassword && data.currentPassword && data.newPassword === data.confirmNewPassword) {
        console.log("Conceptual password change attempt:", { current: data.currentPassword, new: data.newPassword });
        await new Promise(resolve => setTimeout(resolve, 500));
        passwordChangedConceptually = true;
      }

      if (profileUpdated && passwordChangedConceptually) {
        toast({
          title: t("profilePage.form.toast.profilePasswordUpdated"),
          description: t("profilePage.form.toast.profilePasswordUpdatedDescription"),
        });
      } else if (profileUpdated) {
         toast({
          title: t("profilePage.form.toast.profileUpdated"),
          description: t("profilePage.form.toast.profileUpdatedDescription"),
        });
      } else if (passwordChangedConceptually) {
        toast({
          title: t("profilePage.form.toast.passwordUpdated"),
          description: t("profilePage.form.toast.passwordUpdatedDescription"),
        });
      } else if (!profileUpdated && !passwordChangedConceptually && (data.currentPassword || data.newPassword || data.confirmNewPassword)) {
         if (!form.formState.errors.newPassword && !form.formState.errors.confirmNewPassword && !form.formState.errors.currentPassword) {
             toast({
                title: t("profilePage.form.toast.noChanges"),
                description: t("profilePage.form.toast.noChangesDescription"),
                variant: "default",
            });
         }
      } else if (!profileUpdated && !passwordChangedConceptually) {
         toast({
            title: t("profilePage.form.toast.noChangesDetected"),
            description: t("profilePage.form.toast.noChangesDetectedDescription"),
        });
      }

      form.reset({
        ...data,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });

    } catch (error) {
      toast({
        title: t("profilePage.form.toast.updateFailed"),
        description: t("profilePage.form.toast.updateFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                {t("profilePage.form.fullNameLabel")}
              </FormLabel>
              <FormControl>
                <Input placeholder={t("profilePage.form.fullNamePlaceholder")} {...field} />
              </FormControl>
              <FormDescription>{t("profilePage.form.fullNameDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                {t("profilePage.form.emailLabel")}
              </FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("profilePage.form.emailPlaceholder")} {...field} disabled />
              </FormControl>
              <FormDescription>{t("profilePage.form.emailDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-8" />

        <div>
            <h3 className="text-lg font-medium flex items-center mb-1">
                <Lock className="mr-2 h-5 w-5 text-muted-foreground" />
                {t("profilePage.form.changePasswordHeading")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
                {t("profilePage.form.changePasswordDescription")}
            </p>
        </div>

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profilePage.form.currentPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("profilePage.form.passwordPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profilePage.form.newPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("profilePage.form.passwordPlaceholder")} {...field} />
              </FormControl>
               <FormDescription>{t("profilePage.form.newPasswordDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmNewPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profilePage.form.confirmNewPasswordLabel")}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={t("profilePage.form.passwordPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-2 p-3 bg-accent/20 border border-accent/50 rounded-md">
            <ShieldAlert className="h-5 w-5 text-accent" />
            <p className="text-xs text-accent-foreground/80">
                {t("profilePage.form.conceptualPasswordDisclaimer")}
            </p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t("profilePage.form.savingButton")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> {t("profilePage.form.saveChangesButton")}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
