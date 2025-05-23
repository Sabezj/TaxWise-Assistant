
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users2, Loader2, Save } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { createGroupAction } from "@/lib/actions";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

// This page is no longer used. Group creation is now initiated from the profile page.
// Keeping the file for now in case it's needed as a reference, but it should be deleted.

const createGroupFormSchema = (t: Function) => z.object({
  name: z.string().min(3, { message: t("profilePage.createGroupDialog.namePlaceholder") }), // Using existing key
});

type CreateGroupFormValues = z.infer<ReturnType<typeof createGroupFormSchema>>;

export default function CreateGroupPage_DEPRECATED() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoadingUser(false);
      if (!user) {
        router.push('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupFormSchema(t)),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: CreateGroupFormValues) {
    if (!currentUser) {
      toast({ title: t("errors.notAuthenticated"), description: t("errors.notAuthenticatedDescription"), variant: "destructive" });
      return;
    }

    const result = await createGroupAction({ name: values.name, creatorId: currentUser.uid });

    if (result.error) {
      toast({
        title: t("groupsPage.create.toast.errorTitle"),
        description: t("groupsPage.create.toast.errorDescription", { error: result.error }),
        variant: "destructive",
      });
    } else if (result.group) {
      toast({
        title: t("groupsPage.create.toast.successTitle"),
        description: t("groupsPage.create.toast.successDescription", { name: result.group.name }),
      });
      router.push("/dashboard/admin/users"); 
    }
  }

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="container mx-auto py-8 px-4 md:px-0 text-center">
        <p className="text-muted-foreground">{t('errors.notAuthenticated')}</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Users2 className="mr-3 h-7 w-7 text-primary" />
            DEPRECATED: {t("groupsPage.create.title")} 
          </CardTitle>
          <CardDescription>
            This page is no longer in use. Group creation is handled via the profile page.
          </CardDescription>
        </CardHeader>
        <CardContent>
         <p className="text-muted-foreground">This page has been deprecated.</p>
        </CardContent>
      </Card>
    </div>
  );
}
