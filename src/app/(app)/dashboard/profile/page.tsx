
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { UserCircle, ImageIcon, Save, Edit, Loader2, Users2 } from "lucide-react";
import { ProfileForm } from "@/components/profile/profile-form";
import type { UserProfile, Group, AuditLogAction } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/contexts/i18n-context';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { updateProfile as updateFirebaseAuthProfile } from "firebase/auth";
import { createGroupAction, logUserAction } from "@/lib/actions";
import { useRouter } from 'next/navigation';

const CreateGroupDialog: React.FC<{
  userId: string;
  userName: string;
  onGroupCreated: () => void; 
}> = ({ userId, userName, onGroupCreated }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast({ title: t("validation.nameMin"), description: t("profilePage.createGroupDialog.namePlaceholder"), variant: "destructive" });
      return;
    }
    setIsCreating(true);
    const result = await createGroupAction({ name: groupName, creatorId: userId });
    setIsCreating(false);

    if (result.error) {
      toast({
        title: t("profilePage.toast.groupCreationError"),
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("profilePage.toast.groupCreatedAndRoleUpdated"),
        description: t("profilePage.toast.groupCreatedAndRoleUpdatedDescription", { name: groupName }),
      });
      setIsOpen(false);
      setGroupName("");
      onGroupCreated(); 
      router.push('/dashboard/admin/users'); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4">
          <Users2 className="mr-2 h-4 w-4" /> {t("profilePage.createGroupButton")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("profilePage.createGroupDialog.title")}</DialogTitle>
          <DialogDescription>{t("profilePage.createGroupDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="groupName" className="text-right">{t("profilePage.createGroupDialog.nameLabel")}</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
              placeholder={t("profilePage.createGroupDialog.namePlaceholder")}
              disabled={isCreating}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isCreating}>{t("cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isCreating ? t("groupsPage.create.form.creatingButton") : t("profilePage.createGroupDialog.createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const { toast } = useToast();
  const { t } = useI18n();
  const [keyForProfileForm, setKeyForProfileForm] = useState(Date.now());


  const fetchUserProfile = useCallback(async (fbUser: User | null) => {
    if (!fbUser) {
      setUserProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userProfileRef = doc(db, "userProfiles", fbUser.uid);
      const docSnap = await getDoc(userProfileRef);
      if (docSnap.exists()) {
        setUserProfile({ id: fbUser.uid, ...docSnap.data() } as UserProfile);
      } else {
        const initialProfile: UserProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || "New User",
          email: fbUser.email || "user@example.com",
          avatarUrl: fbUser.photoURL || `https://placehold.co/100x100.png?text=${fbUser.displayName?.charAt(0) || fbUser.email?.charAt(0)?.toUpperCase() || 'U'}`,
          role: fbUser.email === "sabezj1@gmail.com" ? "superadmin" : "user", // Ensure superadmin role on creation
          createdAt: new Date().toISOString(),
        };
        await setDoc(userProfileRef, { 
          name: initialProfile.name, 
          email: initialProfile.email, 
          avatarUrl: initialProfile.avatarUrl,
          role: initialProfile.role,
          createdAt: initialProfile.createdAt,
        });
        setUserProfile(initialProfile);
      }
    } catch (error) {
      console.error("Error fetching user profile from Firestore:", error);
      toast({ title: t("profilePage.toast.loadError"), description: t("profilePage.toast.loadErrorDescription", {error: (error as Error).message}), variant: "destructive" });
       setUserProfile({ 
            id: fbUser.uid, 
            name: fbUser.displayName || "Error User", 
            email: fbUser.email || "error@example.com", 
            avatarUrl: fbUser.photoURL,
            role: 'user'
        });
    }
    setIsLoading(false);
    setKeyForProfileForm(Date.now());
  }, [t, toast]);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setCurrentUser(fbUser);
      await fetchUserProfile(fbUser);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const saveUserProfileToFirestore = async (userId: string, updatedProfileData: Partial<UserProfile>) => {
    try {
      const userProfileRef = doc(db, "userProfiles", userId);
      await updateDoc(userProfileRef, updatedProfileData);
      setUserProfile(prevUser => ({ ...prevUser!, ...updatedProfileData, id: userId }));
    } catch (error) {
      console.error("Error saving user profile to Firestore:", error);
      throw error;
    }
  };

  const handleUpdateProfile = useCallback(async (data: Pick<UserProfile, 'name' | 'email'>) => {
    if (!currentUser || !userProfile) return;
    
    let details = "";
    if (data.name !== userProfile.name) details += `Name changed from "${userProfile.name}" to "${data.name}". `;
    // Email changes are usually handled differently, but if allowed:
    // if (data.email !== userProfile.email) details += `Email changed from "${userProfile.email}" to "${data.email}". `;
    
    const profileDataToSave: Partial<UserProfile> = { name: data.name, avatarUrl: userProfile.avatarUrl };
        
    const updates: { displayName?: string; } = {};
    if (data.name !== currentUser.displayName) updates.displayName = data.name;
    
    try {
      if (updates.displayName) {
        await updateFirebaseAuthProfile(currentUser, { displayName: updates.displayName });
      }
      await saveUserProfileToFirestore(currentUser.uid, profileDataToSave);
      if (details.trim()) {
        await logUserAction(currentUser.uid, data.name, "Profile Updated", details.trim());
      }
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: t("profilePage.form.toast.updateFailed"), description: (error as Error).message, variant: "destructive"});
        throw error; 
    }
  }, [currentUser, userProfile, t, toast]);

  const handleAvatarChange = async () => {
    if (currentUser && userProfile && newAvatarUrl.trim()) {
      if (!newAvatarUrl.startsWith('http://') && !newAvatarUrl.startsWith('https://')) {
        toast({ title: t("profilePage.toast.invalidUrl"), description: t("profilePage.toast.invalidUrlDescription"), variant: "destructive" });
        return;
      }
      try {
        const oldAvatarUrl = userProfile.avatarUrl;
        const updatedProfileData = { avatarUrl: newAvatarUrl };
        await updateFirebaseAuthProfile(currentUser, { photoURL: newAvatarUrl });
        await saveUserProfileToFirestore(currentUser.uid, updatedProfileData);
        
        await logUserAction(currentUser.uid, userProfile.name, "Avatar Changed", `Old URL: ${oldAvatarUrl}, New URL: ${newAvatarUrl}`);
        toast({ title: t("profilePage.toast.avatarUpdated"), description: t("profilePage.toast.avatarUpdatedDescription") });
        setIsAvatarDialogOpen(false);
        setNewAvatarUrl("");
      } catch (error) {
         toast({ title: t("profilePage.form.toast.updateFailed"), description: (error as Error).message, variant: "destructive"});
      }
    } else {
      toast({ title: t("profilePage.toast.noUrlProvided"), description: t("profilePage.toast.noUrlProvidedDescription"), variant: "destructive" });
    }
  };

  const handleGroupCreated = () => {
    if (currentUser) {
      fetchUserProfile(currentUser); 
    }
  };

  useEffect(() => {
    if (userProfile?.avatarUrl && isAvatarDialogOpen) {
      setNewAvatarUrl(userProfile.avatarUrl);
    }
  }, [userProfile?.avatarUrl, isAvatarDialogOpen]);

  if (isLoading || !currentUser || !userProfile) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('profilePage.loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <h1 className="text-3xl font-bold mb-8 text-foreground">{t('profilePage.title')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1">
          <Card className="shadow-lg text-center sticky top-20">
            <CardHeader>
              <Avatar className="h-24 w-24 mx-auto mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background">
                <AvatarImage src={userProfile.avatarUrl || `https://placehold.co/100x100.png?text=${userProfile.name.charAt(0)}`} alt={userProfile.name} data-ai-hint="user avatar" />
                <AvatarFallback>{userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
              <CardDescription>{userProfile.email}</CardDescription>
               <CardDescription className="capitalize mt-1 text-sm text-accent">{t(`roles.${userProfile.role}`)}</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <ImageIcon className="mr-2 h-4 w-4" /> {t("profilePage.avatarCard.changeAvatarButton")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("profilePage.avatarDialog.title")}</DialogTitle>
                    <DialogDescription>{t("profilePage.avatarDialog.description")}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="avatarUrl" className="text-right">{t("profilePage.avatarDialog.imageUrlLabel")}</Label>
                      <Input
                        id="avatarUrl"
                        value={newAvatarUrl}
                        onChange={(e) => setNewAvatarUrl(e.target.value)}
                        className="col-span-3"
                        placeholder={t("profilePage.avatarDialog.imageUrlPlaceholder")}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">{t("cancel")}</Button>
                    </DialogClose>
                    <Button onClick={handleAvatarChange}><Save className="mr-2 h-4 w-4"/> {t("profilePage.avatarDialog.setAvatarButton")}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {userProfile.role === 'user' && currentUser && (
                 <CreateGroupDialog userId={currentUser.uid} userName={userProfile.name || userProfile.email} onGroupCreated={handleGroupCreated} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Edit className="mr-3 h-7 w-7 text-primary" />
                {t('profilePage.editCard.title')}
              </CardTitle>
              <CardDescription>
                {t('profilePage.editCard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm key={keyForProfileForm} user={userProfile} onUpdateProfile={handleUpdateProfile} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
