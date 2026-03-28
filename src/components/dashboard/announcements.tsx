'use client'

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Announcement, UserProfile } from "@/types";
import { PlusCircle, Send, Loader2, Trash2, Edit } from "lucide-react";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/lib/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type AnnouncementsProps = {
    readonly userProfile: UserProfile | null;
};

export function Announcements({ userProfile }: Readonly<AnnouncementsProps>) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', targetAudiences: [] as string[] });
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
    
    const TARGET_AUDIENCES = [
        { value: 'new-signup', label: 'Yeni Kayıt' },
        { value: 'junior', label: 'Junior' },
        { value: 'junior-plus', label: 'Junior Plus' },
        { value: 'mid', label: 'Mid' },
        { value: 'mid-plus', label: 'Mid Plus' },
        { value: 'senior', label: 'Senior' },
    ];

    const announcementsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc')) : null,
        [firestore]
    );
    const { data: allAnnouncements, isLoading } = useCollection<Announcement>(announcementsQuery);
    
    // Filter announcements based on user's classroom level
    const announcements = useMemo(() => {
        if (!allAnnouncements || !userProfile) return [];
        
        // Teachers see all announcements
        if (userProfile.role?.trim() === 'teacher') {
            return allAnnouncements;
        }
        
        // Students see announcements targeted to their classroom or with no target (for backward compatibility)
        const studentClassroom = userProfile.classroom;
        if (!studentClassroom) return [];
        
        return allAnnouncements.filter(announcement => {
            // If no targetAudiences, show to all (backward compatibility)
            if (!announcement.targetAudiences || announcement.targetAudiences.length === 0) {
                return true;
            }
            // Show if student's classroom is in target audiences
            return announcement.targetAudiences.includes(studentClassroom);
        });
    }, [allAnnouncements, userProfile]);

    const buttonText = useMemo(() => {
        if (isSubmitting) {
            if (editingAnnouncement) {
                return 'Güncelleniyor...';
            }
            return 'Yayınlanıyor...';
        }
        if (editingAnnouncement) {
            return 'Güncelle';
        }
        return 'Yayınla';
    }, [isSubmitting, editingAnnouncement]);

    const handleAddAnnouncement = () => {
        if (!firestore || !user || !userProfile || !newAnnouncement.title || !newAnnouncement.content || newAnnouncement.targetAudiences.length === 0) return;
        
        setIsSubmitting(true);

        try {
            const announcementRef = collection(firestore, 'announcements');
            // addDocumentNonBlocking is fire-and-forget, returns void, not a Promise
            // It already adds createdAt and updatedAt timestamps internally
            addDocumentNonBlocking(announcementRef, {
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                targetAudiences: newAnnouncement.targetAudiences,
                authorName: userProfile.displayName ?? 'Öğretmen'
            });

            toast({
                title: "Duyuru Eklendi!",
                description: "Yeni duyurunuz başarıyla yayınlandı.",
            });
            setNewAnnouncement({ title: '', content: '', targetAudiences: [] });
            setIsFormOpen(false);
        } catch (error) {
            console.error('Duyuru ekleme hatası:', error);
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Duyuru eklenirken bir hata oluştu.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAnnouncement = async () => {
        if (!firestore || !editingAnnouncement || !newAnnouncement.title || !newAnnouncement.content || newAnnouncement.targetAudiences.length === 0) return;
        
        setIsSubmitting(true);

        try {
            const announcementRef = doc(firestore, 'announcements', editingAnnouncement.id);
            await updateDoc(announcementRef, {
                title: newAnnouncement.title,
                content: newAnnouncement.content,
                targetAudiences: newAnnouncement.targetAudiences,
                updatedAt: serverTimestamp()
            });

            toast({
                title: "Duyuru Güncellendi!",
                description: "Duyuru başarıyla güncellendi.",
            });
            setNewAnnouncement({ title: '', content: '', targetAudiences: [] });
            setEditingAnnouncement(null);
            setIsFormOpen(false);
        } catch (error) {
            console.error('Duyuru güncelleme hatası:', error);
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Duyuru güncellenirken bir hata oluştu.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setNewAnnouncement({
            title: announcement.title,
            content: announcement.content,
            targetAudiences: announcement.targetAudiences ?? []
        });
        setIsFormOpen(true);
    };

    const handleDeleteAnnouncement = async () => {
        if (!firestore || !announcementToDelete) return;

        try {
            const announcementRef = doc(firestore, 'announcements', announcementToDelete.id);
            await deleteDoc(announcementRef);
            
            toast({
                title: "Duyuru Silindi",
                description: `'${announcementToDelete.title}' başlıklı duyuru silindi.`,
            });
            
            setAnnouncementToDelete(null);
        } catch (error) {
            console.error('Duyuru silme hatası:', error);
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Duyuru silinirken bir hata oluştu.",
            });
        }
    };

    /**
     * Helper: Render announcements list with proper conditional logic
     */
    const renderAnnouncementsList = () => {
        if (isLoading) {
    return (
                <>
                    {Array.from({ length: 3 }, (_, i) => (
                        <div key={`announcement-skeleton-${i}`} className="bg-slate-50 rounded-xl p-4 animate-pulse">
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-3 bg-slate-200 rounded w-full mb-3"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                </div>
                    ))}
                </>
            );
        }

        if (!announcements || announcements.length === 0) {
            return (
                <div className="text-center text-slate-500 py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📢</span>
                    </div>
                    <p className="text-sm">Henüz bir duyuru yok.</p>
                </div>
            );
        }

        return (
            <>
                {announcements.map(announcement => (
                                <div key={announcement.id} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative">
                                    {userProfile?.role?.trim() === 'teacher' && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => handleEditClick(announcement)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => setAnnouncementToDelete(announcement)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    <h4 className="font-semibold text-slate-800 mb-2 pr-8">{announcement.title}</h4>
                                    <p className="text-sm text-slate-600 mb-3">{announcement.content}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                        <span>{announcement.authorName}</span>
                                        <span>•</span>
                                        <span>{announcement.createdAt ? formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true, locale: tr }) : 'az önce'}</span>
                                    </div>
                                </div>
                ))}
            </>
        );
    };

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
            <div className="p-6 border-b border-slate-200/60">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">📢</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">Duyurular</h2>
                                </div>
                <p className="text-slate-600 text-sm">Okul ve derslerle ilgili en son güncellemeler</p>
                            </div>
            
            <div className="p-6">
                <ScrollArea className="h-80">
                    <div className="space-y-4 pr-4">
                        {renderAnnouncementsList()}
                    </div>
                </ScrollArea>
            </div>
            
            {userProfile?.role?.trim() === 'teacher' && (
                <div className="p-6 border-t border-slate-200/60">
                    <Button onClick={() => setIsFormOpen(true)} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium py-3 rounded-xl transition-all duration-200 hover:shadow-lg">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Yeni Duyuru Ekle
                    </Button>
                </div>
            )}

            <Dialog open={isFormOpen} onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) {
                    setEditingAnnouncement(null);
                    setNewAnnouncement({ title: '', content: '', targetAudiences: [] });
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAnnouncement ? 'Duyuruyu Düzenle' : 'Yeni Duyuru Oluştur'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="announcement-title">Duyuru Başlığı <span className="text-red-500">*</span></Label>
                            <Input
                                id="announcement-title"
                                placeholder="Duyuru Başlığı"
                                value={newAnnouncement.title}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="announcement-content">Duyuru İçeriği <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="announcement-content"
                                placeholder="Duyuru içeriğini buraya yazın..."
                                value={newAnnouncement.content}
                                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                disabled={isSubmitting}
                                rows={6}
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label className="text-sm font-medium">Hedef Seviyeler (1 veya daha fazla seçin) <span className="text-red-500">*</span></Label>
                            <div className="grid grid-cols-2 gap-3">
                                {TARGET_AUDIENCES.map((audience) => (
                                    <div key={audience.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`audience-${audience.value}`}
                                            checked={newAnnouncement.targetAudiences.includes(audience.value)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setNewAnnouncement({
                                                        ...newAnnouncement,
                                                        targetAudiences: [...newAnnouncement.targetAudiences, audience.value]
                                                    });
                                                } else {
                                                    setNewAnnouncement({
                                                        ...newAnnouncement,
                                                        targetAudiences: newAnnouncement.targetAudiences.filter(a => a !== audience.value)
                                                    });
                                                }
                                            }}
                                            disabled={isSubmitting}
                                        />
                                        <Label
                                            htmlFor={`audience-${audience.value}`}
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            {audience.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Seçilen seviyelere duyuru gösterilecektir. En az bir seçim yapmalısınız.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={editingAnnouncement ? handleUpdateAnnouncement : handleAddAnnouncement} 
                            disabled={isSubmitting || !newAnnouncement.title || !newAnnouncement.content || newAnnouncement.targetAudiences.length === 0}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {buttonText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!announcementToDelete} onOpenChange={(open) => !open && setAnnouncementToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Duyuruyu Sil</AlertDialogTitle>
                        <AlertDialogDescription>
                            '{announcementToDelete?.title}' başlıklı duyuruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAnnouncement}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
