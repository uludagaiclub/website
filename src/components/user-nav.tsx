
'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { toast } from "@/lib/use-toast"
import { useAuth, useUser, useFirebase } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { useState } from "react"

function validateName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Bu alan boş bırakılamaz' };
  }
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'En az 2 karakter olmalı' };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, error: 'En fazla 50 karakter olabilir' };
  }
  
  if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(trimmed)) {
    return { valid: false, error: 'Sadece harf ve boşluk kullanılabilir' };
  }
  
  return { valid: true };
}

export function UserNav() {
  const router = useRouter()
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  
  // Profile edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form when dialog opens
  const handleOpenDialog = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      setFirstName(names[0] || '');
      setLastName(names.slice(1).join(' ') || '');
    } else {
      setFirstName('');
      setLastName('');
    }
    setIsEditDialogOpen(true);
  };
  
  const handleSaveProfile = async () => {
    if (!user || !firestore) return;
    
    // 1. Validation
    const firstNameValidation = validateName(firstName);
    const lastNameValidation = validateName(lastName);
    
    if (!firstNameValidation.valid) {
      toast({ 
        variant: "destructive", 
        title: "Ad Hatası", 
        description: firstNameValidation.error 
      });
      return;
    }
    
    if (!lastNameValidation.valid) {
      toast({ 
        variant: "destructive", 
        title: "Soyad Hatası", 
        description: lastNameValidation.error 
      });
      return;
    }
    
    // 2. Sanitize input
    const sanitizedFirstName = firstName.trim();
    const sanitizedLastName = lastName.trim();
    const fullDisplayName = `${sanitizedFirstName} ${sanitizedLastName}`;
    
    setIsSaving(true);
    
    try {
      // 3. Update Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: fullDisplayName,
        // UID değiştirilmiyor - güvenlik
        uid: user.uid
      });
      
      // 4. Update Firebase Auth displayName (senkronizasyon)
      await updateProfile(user, {
        displayName: fullDisplayName
      });
      
      // 5. Success feedback
      toast({
        title: "Profil Güncellendi",
        description: "Bilgileriniz başarıyla kaydedildi."
      });
      
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Güncelleme Başarısız",
        description: error.message || "Bir hata oluştu"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
      toast({
        title: "Başarıyla çıkış yapıldı",
        description: "Giriş sayfasına yönlendiriliyorsunuz.",
      })
    } catch(error: any) {
       toast({
        variant: "destructive",
        title: "Çıkış yapılamadı.",
        description: error.message,
      })
    }
  }

  const getInitials = (displayName: string | null | undefined, email: string | null | undefined) => {
    if (displayName) {
        const names = displayName.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length-1][0]}`.toUpperCase();
        }
        return displayName.substring(0,2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (isUserLoading) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    )
  }

  if (!user) {
    return null; // Or a login button
  }


  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User avatar'} />}
            <AvatarFallback>{getInitials(user?.displayName, user?.email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName || 'Kullanıcı'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenDialog}>
            Profil Düzenle
          </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          Çıkış Yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profil Düzenle</DialogTitle>
            <DialogDescription>
              Adınızı ve soyadınızı güncelleyin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Ad</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Adınız"
                disabled={isSaving}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Soyad</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Soyadınız"
                disabled={isSaving}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              İptal
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
