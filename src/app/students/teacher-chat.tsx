'use client';

import { useState, useRef, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, addDoc, where } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface ChatMessage {
    id: string;
    text: string;
    authorName: string;
    authorId: string;
    photoURL?: string | null;
    createdAt: any;
}

export function TeacherChat() {
    const { firestore, user } = useFirebase();
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const teacherSkeletonCount = 4;

    const chatQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'teacherChat'), orderBy('createdAt', 'asc')) : null,
        [firestore]
    );
    const { data: messages, isLoading: isLoadingMessages } = useCollection<ChatMessage>(chatQuery);

    const teachersQuery = useMemoFirebase(() => 
        firestore ? query(collection(firestore, 'users'), where('role', '==', 'teacher')) : null,
        [firestore]
    );
    const { data: teachers, isLoading: isLoadingTeachers } = useCollection<UserProfile>(teachersQuery);


    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'Ö';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleSendMessage = async () => {
        if (!firestore || !user || !newMessage.trim()) return;

        setIsSending(true);
        const chatCollection = collection(firestore, 'teacherChat');
        try {
            await addDoc(chatCollection, {
                text: newMessage,
                authorName: user.displayName ?? 'Öğretmen',
                authorId: user.uid,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Mesaj gönderilirken hata oluştu:", error);
        } finally {
            setIsSending(false);
        }
    };
    
    useEffect(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }, [messages]);

    const renderMessages = () => {
        if (isLoadingMessages) {
    return (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
            );
        }

        if (messages && messages.length > 0) {
            return messages.map(msg => (
                                        <div key={msg.id} className={`flex items-start gap-3 ${msg.authorId === user?.uid ? 'justify-end' : ''}`}>
                                            {msg.authorId !== user?.uid && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={msg.photoURL ?? undefined} />
                                                    <AvatarFallback>{getInitials(msg.authorName)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`max-w-xs rounded-xl px-4 py-2 ${msg.authorId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                <p className="text-sm">{msg.text}</p>
                                                <p className={`text-xs mt-1 ${msg.authorId === user?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                                    {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true, locale: tr }) : 'şimdi'}
                                                </p>
                                            </div>
                                            {msg.authorId === user?.uid && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={msg.photoURL ?? undefined} />
                                                    <AvatarFallback>{getInitials(msg.authorName)}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
            ));
        }

        return (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-muted-foreground">Sohbet başlatın!</p>
                                    </div>
        );
    };

    const renderTeachersList = () => {
        if (isLoadingTeachers) {
            // Generate stable skeleton keys (skeleton items are static, so stable keys are acceptable)
            const skeletonKeys = Array.from({ length: teacherSkeletonCount }, (_, i) => `teacher-chat-skeleton-${i}`);
            return skeletonKeys.map((skeletonKey) => (
                <div key={skeletonKey} className="flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-muted"></div>
                    <div className="h-4 w-3/5 rounded bg-muted"></div>
                </div>
            ));
        }

        if (teachers && teachers.length > 0) {
            return (
                <TooltipProvider>
                    {teachers.map(teacher => (
                        <div key={teacher.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={teacher.photoURL ?? undefined} />
                                <AvatarFallback>{getInitials(teacher.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm font-medium truncate">{teacher.displayName}</div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="w-2 h-2 rounded-full bg-green-500 ml-auto flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Çevrimiçi</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    ))}
                </TooltipProvider>
            );
        }

        return <p className="text-sm text-muted-foreground">Öğretmen bulunamadı.</p>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Öğretmenler Odası</CardTitle>
                <CardDescription>Sadece öğretmenlerin görebileceği özel sohbet ve koordinasyon alanı.</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-6">
                {/* Chat Section */}
                <div className="md:col-span-2">
                    <CardContent className="p-0">
                        <ScrollArea className="h-72 w-full pr-4" ref={scrollAreaRef}>
                            <div className="space-y-4">
                                {renderMessages()}
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-0 pt-4">
                        <div className="flex w-full items-center space-x-2">
                            <Input
                                placeholder="Mesajınızı yazın..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                                disabled={isSending}
                            />
                            <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                <span className="sr-only">Gönder</span>
                            </Button>
                        </div>
                    </CardFooter>
                </div>

                {/* Teachers List Section */}
                <div className="md:col-span-1 border-l border-border pl-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Öğretmenler</h3>
                    </div>
                    <ScrollArea className="h-80">
                        <div className="space-y-3 pr-4">
                            {renderTeachersList()}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </Card>
    );
}
