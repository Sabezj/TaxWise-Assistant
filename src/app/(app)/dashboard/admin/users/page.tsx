
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users as UsersIconLucide, Edit3, Trash2, UserPlus, Filter, Loader2, Save, ShieldCheck, User as UserIconLucide } from "lucide-react";
import type { UserProfile, UserRole, DisplayUser, Group, AdminCreateUserInput, AuditLogAction } from "@/types";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/i18n-context';
import { format, subDays, subHours } from 'date-fns';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, getDoc, writeBatch, arrayUnion } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { adminCreateUserAction, logUserAction } from '@/lib/actions';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

const generateMockLastLogin = () => format(subHours(new Date(), Math.random() * 72), 'yyyy-MM-dd HH:mm aa');

const addUserFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t("registerForm.validation.nameMin") }),
  email: z.string().email({ message: t("registerForm.validation.emailInvalid") }),
  password: z.string().min(6, { message: t("registerForm.validation.passwordMin") }),
  role: z.custom<UserRole>().optional(),
});

type AddUserFormValues = z.infer<ReturnType<typeof addUserFormSchema>>;

const AddUserDialog: React.FC<{
  onUserAdded: () => void;
  currentUserProfile: UserProfile | null;
  trigger: React.ReactNode;
}> = ({ onUserAdded, currentUserProfile, trigger }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserFormSchema(t)),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "user",
    },
  });

  const handleSubmit = async (values: AddUserFormValues) => {
    if (!currentUserProfile) {
      toast({ title: t("errors.notAuthenticated"), variant: "destructive" });
      return;
    }

    let primaryGroupId: string | undefined = undefined;
    if (currentUserProfile.role === 'admin' && currentUserProfile.role !== 'superadmin') {
        const groupsQuery = query(collection(db, "groups"), where("adminId", "==", currentUserProfile.id));
        const groupsSnapshot = await getDocs(groupsQuery);
        if (!groupsSnapshot.empty) {
            primaryGroupId = groupsSnapshot.docs[0].id;
        } else {
            toast({ title: t("adminUsersPage.toast.groupAdminError.noGroupTitle"), description: t("adminUsersPage.toast.groupAdminError.noGroupDescription"), variant: "destructive"});
            return;
        }
    }

    const userDetailsToCreate: AdminCreateUserInput = {
        name: values.name,
        email: values.email,
        password: values.password,
        role: currentUserProfile.role === 'superadmin' ? values.role : 'user',
    };

    const result = await adminCreateUserAction(
        currentUserProfile.id,
        currentUserProfile.name || currentUserProfile.email || "Unknown User",
        userDetailsToCreate,
        primaryGroupId
    );

    if (result.success) {
      toast({
        title: t("adminUsersPage.toast.userAdded"),
        description: currentUserProfile.role === 'admin'
            ? t("adminUsersPage.toast.userAddedToGroup", { name: values.name })
            : t("adminUsersPage.toast.userActionSuccessDescription", { name: values.name, action: t("adminUsersPage.toast.userActionSuccess.added") }),
      });
      setIsOpen(false);
      form.reset();
      onUserAdded();
    } else {
      toast({
        title: t("adminUsersPage.toast.addError"),
        description: result.error || t("registerForm.error.default"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("adminUsersPage.userFormDialog.titleAdd")}</DialogTitle>
          <DialogDescription>{t("adminUsersPage.userFormDialog.descriptionAdd")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">{t("adminUsersPage.userFormDialog.nameLabel")}</Label>
                            <FormControl className="col-span-3">
                                <Input id="name" placeholder={t("adminUsersPage.userFormDialog.namePlaceholder")} {...field} />
                            </FormControl>
                            <FormMessage className="col-span-4 text-right" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">{t("adminUsersPage.userFormDialog.emailLabel")}</Label>
                            <FormControl className="col-span-3">
                                <Input id="email" type="email" placeholder={t("adminUsersPage.userFormDialog.emailPlaceholder")} {...field} />
                            </FormControl>
                             <FormMessage className="col-span-4 text-right" />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">{t("adminUsersPage.userFormDialog.passwordLabel")}</Label>
                            <FormControl className="col-span-3">
                                <Input id="password" type="password" placeholder={t("adminUsersPage.userFormDialog.passwordPlaceholder")} {...field} />
                            </FormControl>
                             <FormMessage className="col-span-4 text-right" />
                        </FormItem>
                    )}
                />
                {currentUserProfile?.role === 'superadmin' && (
                     <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">{t("adminUsersPage.userFormDialog.roleLabel")}</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                    <FormControl className="col-span-3">
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminUsersPage.userFormDialog.selectRolePlaceholder")} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="user">{t("roles.user")}</SelectItem>
                                    <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                                    <SelectItem value="superadmin">{t("roles.superadmin")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage className="col-span-4 text-right" />
                            </FormItem>
                        )}
                    />
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={form.formState.isSubmitting}>{t("cancel")}</Button>
                    </DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                         {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" /> }
                         {t("adminUsersPage.userFormDialog.addButton")}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const UserFormDialog: React.FC<{
  user?: DisplayUser | null;
  onSave: (user: UserProfile, oldRole?: UserRole) => void;
  trigger: React.ReactNode;
  isEditMode: boolean;
  currentUserRole?: UserRole;
}> = ({ user, onSave, trigger, isEditMode, currentUserRole }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [role, setRole] = useState<UserRole>(user?.role || "user");
  const { toast } = useToast();
  const originalRole = user?.role;

  useEffect(() => {
    if (isOpen) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setRole(user?.role || "user");
    }
  }, [isOpen, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: t("adminUsersPage.toast.validationError"), description: t("adminUsersPage.toast.validationErrorNameEmailEmpty"), variant: "destructive" });
      return;
    }

    if (!user || !user.id) {
        toast({ title: t("errors.defaultErrorTitle"), description: "User data is missing for save.", variant: "destructive" });
        return;
    }

    const userToSave: UserProfile = {
      id: user.id,
      name,
      email: user.email,
      role,
      avatarUrl: user.avatarUrl || `https://placehold.co/100x100.png?text=${name.charAt(0).toUpperCase() || 'U'}`,
      createdAt: user.createdAt || new Date().toISOString(),
    };
    onSave(userToSave, originalRole);
    setIsOpen(false);
    toast({
        title: t("adminUsersPage.toast.userUpdated"),
        description: t("adminUsersPage.toast.userActionSuccessDescription", { name, action: t("adminUsersPage.toast.userActionSuccess.updated") })
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("adminUsersPage.userFormDialog.titleEdit") : t("adminUsersPage.userFormDialog.titleAdd")}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("adminUsersPage.userFormDialog.descriptionEdit") : t("adminUsersPage.userFormDialog.descriptionAdd")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">{t("adminUsersPage.userFormDialog.nameLabel")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder={t("adminUsersPage.userFormDialog.namePlaceholder")} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">{t("adminUsersPage.userFormDialog.emailLabel")}</Label>
            <Input id="email" type="email" value={email} className="col-span-3" disabled />
          </div>
          {currentUserRole === 'superadmin' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">{t("adminUsersPage.userFormDialog.roleLabel")}</Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)} disabled={user?.email === 'sabezj1@gmail.com'}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("adminUsersPage.userFormDialog.selectRolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("roles.user")}</SelectItem>
                  <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                  <SelectItem value="superadmin">{t("roles.superadmin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button type="submit"> <Save className="mr-2 h-4 w-4" /> {t("adminUsersPage.userFormDialog.saveButton")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        const userProfileRef = doc(db, "userProfiles", user.uid);
        const docSnap = await getDoc(userProfileRef);
        if (docSnap.exists()) {
          const profile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          setCurrentUserProfile(profile);
          if (profile.role !== 'admin' && profile.role !== 'superadmin') {
            router.push('/dashboard');
          }
        } else {
            router.push('/dashboard');
        }
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
        router.push('/login');
      }
      setIsLoadingPermissions(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    if (!currentUserProfile) return;
    setIsLoading(true);
    let fetchedUserProfiles: UserProfile[] = [];

    try {
      if (currentUserProfile.role === 'superadmin') {
        const usersCollectionRef = collection(db, "userProfiles");
        const querySnapshot = await getDocs(usersCollectionRef);
        fetchedUserProfiles = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<UserProfile, 'id'>),
        }));
      } else if (currentUserProfile.role === 'admin') {
        const groupsQuery = query(collection(db, "groups"), where("adminId", "==", currentUserProfile.id));
        const groupsSnapshot = await getDocs(groupsQuery);

        const groupMemberIds = new Set<string>();
        groupsSnapshot.forEach(groupDoc => {
            const groupData = groupDoc.data() as Group;
            (groupData.memberIds || []).forEach(id => groupMemberIds.add(id));
        });

        groupMemberIds.add(currentUserProfile.id);

        const memberIdsArray = Array.from(groupMemberIds);
        if (memberIdsArray.length > 0) {
            const MAX_IDS_PER_QUERY = 30;
            for (let i = 0; i < memberIdsArray.length; i += MAX_IDS_PER_QUERY) {
                const batchIds = memberIdsArray.slice(i, i + MAX_IDS_PER_QUERY);
                if (batchIds.length > 0) {
                    const usersQuery = query(collection(db, "userProfiles"), where("id", "in", batchIds));
                    const usersSnapshot = await getDocs(usersQuery);
                    usersSnapshot.docs.forEach(docSnap => {
                        fetchedUserProfiles.push({ id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'id'>) });
                    });
                }
            }
        }
      }

      const displayUsers = fetchedUserProfiles.map(u => ({...u, lastLogin: generateMockLastLogin()}));
      setUsers(displayUsers);

    } catch (error) {
      console.error("Error fetching users: ", error);
      toast({ title: t("adminUsersPage.toast.fetchError"), description: (error as Error).message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [currentUserProfile, toast, t]);

  useEffect(() => {
    if (currentUserProfile && (currentUserProfile.role === 'admin' || currentUserProfile.role === 'superadmin')) {
      fetchUsers();
    } else if (currentUserProfile) {
      setIsLoading(false);
      setUsers([]);
    }
  }, [currentUserProfile, fetchUsers]);

  const handleSaveUser = useCallback(async (userToSave: UserProfile, oldRole?: UserRole) => {
    if (!currentUserProfile || currentUserProfile.role !== 'superadmin') {
      toast({ title: t("errors.unauthorizedAccess"), variant: "destructive" });
      return;
    }
    const userRef = doc(db, "userProfiles", userToSave.id);
    try {
      const dataToUpdate: Partial<UserProfile> = {
        name: userToSave.name,
        role: userToSave.role,
        avatarUrl: userToSave.avatarUrl,
      };
      await updateDoc(userRef, dataToUpdate);
      if (oldRole && userToSave.role !== oldRole) {
        await logUserAction(
            currentUserProfile.id,
            currentUserProfile.name || currentUserProfile.email || "Unknown User",
            "User Role Changed by Admin",
            `User: ${userToSave.name} (${userToSave.email}), Old Role: ${oldRole}, New Role: ${userToSave.role}`
        );
      }
      fetchUsers();
    } catch (error) {
      console.error("Error saving user to Firestore: ", error);
      toast({ title: t("adminUsersPage.toast.saveError"), description: (error as Error).message, variant: "destructive" });
    }
  }, [fetchUsers, toast, t, currentUserProfile]);

  const handleDeleteUser = async (userId: string) => {
    if (!currentUserProfile || currentUserProfile.role !== 'superadmin') {
        toast({ title: t("errors.unauthorizedAccess"), variant: "destructive" });
        return;
    }
    if (userId === currentUserProfile.id) {
        toast({ title: t("adminUsersPage.toast.deleteErrorSelf"), variant: "destructive" });
        return;
    }
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.email === 'sabezj1@gmail.com') {
         toast({ title: t("adminUsersPage.toast.deleteErrorSuperadminFixed"), variant: "destructive" });
        return;
    }

    if (confirm(t("adminUsersPage.deleteConfirmMessage", { name: userToDelete?.name || userId }))) {
      try {

        console.log(`Conceptual: Would delete user ${userId} from Firebase Auth if Admin SDK was used.`);

        const batch = writeBatch(db);

        batch.delete(doc(db, "userProfiles", userId));
        batch.delete(doc(db, "userSettings", userId));
        batch.delete(doc(db, "userFinancialData", userId));
        batch.delete(doc(db, "userDocumentMetadata", userId));

        const groupsMemberQuery = query(collection(db, "groups"), where("memberIds", "array-contains", userId));
        const memberGroupsSnapshot = await getDocs(groupsMemberQuery);
        memberGroupsSnapshot.forEach(groupDoc => {
          const groupData = groupDoc.data() as Group;
          const updatedMemberIds = groupData.memberIds.filter(id => id !== userId);
          batch.update(doc(db, "groups", groupDoc.id), { memberIds: updatedMemberIds });
        });

        const groupsAdminQuery = query(collection(db, "groups"), where("adminId", "==", userId));
        const adminGroupsSnapshot = await getDocs(groupsAdminQuery);
        adminGroupsSnapshot.forEach(groupDoc => {
          batch.delete(doc(db, "groups", groupDoc.id));
        });

        console.log(`Conceptual: Would delete files for user ${userId} from Firebase Storage.`);

        await batch.commit();

        await logUserAction(
            currentUserProfile.id,
            currentUserProfile.name || currentUserProfile.email || "Unknown User",
            "User Deleted by Admin",
            `Deleted User: ${userToDelete?.name || "Unknown"} (${userToDelete?.email || userId})`
        );

        toast({ title: t("adminUsersPage.toast.userDeleted"), description: t("adminUsersPage.toast.userDeletedDescription", { name: userToDelete?.name || userId }) });
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user and their data: ", error);
        toast({ title: t("adminUsersPage.toast.deleteError"), description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    if (role === 'superadmin') return t('roles.superadmin');
    if (role === 'admin') return t('roles.admin');
    return t('roles.user');
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRoleDisplayName(user.role).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleIcons: Record<UserRole, React.ElementType> = {
    user: UserIconLucide,
    admin: ShieldCheck,
    superadmin: ShieldCheck,
  };

  if (isLoadingPermissions || !currentUserProfile) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (currentUserProfile.role !== 'admin' && currentUserProfile.role !== 'superadmin') {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0 text-center">
        <p className="text-muted-foreground">{t('errors.unauthorizedAccess')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4 sm:mb-0">{t('adminUsersPage.title')}</h1>
        <div className="flex space-x-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:flex-grow-0">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder={t("adminUsersPage.filterPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                />
            </div>
            {(currentUserProfile.role === 'admin' || currentUserProfile.role === 'superadmin') && (
                 <AddUserDialog
                    onUserAdded={fetchUsers}
                    currentUserProfile={currentUserProfile}
                    trigger={
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" /> {t("adminUsersPage.addUserButton")}
                        </Button>
                    }
                />
            )}
        </div>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <UsersIconLucide className="mr-3 h-7 w-7 text-primary" />
            {t('adminUsersPage.userAdminCard.title')}
          </CardTitle>
          <CardDescription>
            {t('adminUsersPage.userAdminCard.description', { count: filteredUsers.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center p-8 space-x-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-muted-foreground">{t("adminUsersPage.loading")}</p>
            </div>
          ) : filteredUsers.length === 0 && searchTerm ? (
            <p className="text-muted-foreground text-center py-4">{t("adminUsersPage.emptyFilter.message", { searchTerm })}</p>
          ) : filteredUsers.length === 0 ? (
             <p className="text-muted-foreground text-center py-4">
                {currentUserProfile.role === 'admin'
                    ? t("adminUsersPage.empty.groupAdminMessage")
                    : t("adminUsersPage.empty.superAdminMessage")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminUsersPage.table.header.name")}</TableHead>
                  <TableHead>{t("adminUsersPage.table.header.email")}</TableHead>
                  <TableHead>{t("adminUsersPage.table.header.role")}</TableHead>
                  <TableHead>{t("adminUsersPage.table.header.lastLogin")}</TableHead>
                  <TableHead className="text-right">{t("adminUsersPage.table.header.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role] || UserIconLucide;
                  const canEdit = currentUserProfile.role === 'superadmin' &&
                                  !(user.email === 'sabezj1@gmail.com' && currentUserProfile.email !== 'sabezj1@gmail.com');

                  const canDelete = currentUserProfile.role === 'superadmin' &&
                                    user.id !== currentUserProfile.id &&
                                    user.email !== "sabezj1@gmail.com";

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "superadmin" ? "default" : user.role === "admin" ? "secondary" : "outline"}
                               className={cn(
                                user.role === 'superadmin' ? 'bg-primary text-primary-foreground' :
                                user.role === 'admin' ? 'bg-accent text-accent-foreground' : ''
                               )}
                        >
                          <RoleIcon className="mr-1.5 h-3.5 w-3.5" />
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.lastLogin || t('adminUsersPage.neverLoggedIn')}</TableCell>
                      <TableCell className="text-right space-x-1">
                       <UserFormDialog
                            user={user}
                            onSave={handleSaveUser}
                            isEditMode={true}
                            currentUserRole={currentUserProfile?.role}
                            trigger={
                                <Button variant="outline" size="icon" className="h-8 w-8" title={t("adminUsersPage.actions.editUserTitle")}
                                disabled={!canEdit}>
                                    <Edit3 className="h-4 w-4" />
                                </Button>
                            }
                        />
                      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteUser(user.id)} title={t("adminUsersPage.actions.deleteUserTitle")} disabled={!canDelete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
               <TableCaption>{t("adminUsersPage.table.caption")}</TableCaption>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
