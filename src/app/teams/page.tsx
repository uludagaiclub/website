'use client'

import { useState, useEffect, useMemo } from "react";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, updateDoc, orderBy, addDoc, Timestamp } from "firebase/firestore";
import type { UserProfile, TeamChatMessage, Task } from "@/types";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users2, Target, Award, Star, Rocket, Zap, Eye, Edit, UserCog, Settings, MessageSquare, CheckSquare2, Save, Send } from "lucide-react";
import { getRoleDisplayName } from "@/lib/roles";
import { useToast } from "@/lib/use-toast";

// Takım verileri (şimdilik hardcoded, sonra Firestore'dan çekilebilir)
const teams = [
  {
    id: 1,
    name: "YZT TALOS",
    status: "active",
    color: "from-blue-500 to-cyan-500",
    icon: Target,
    description: "Yapay zeka ve teknoloji alanında öncü takım"
  },
  {
    id: 2,
    name: "YZT MEVZU",
    status: "active",
    color: "from-purple-500 to-pink-500",
    icon: Target,
    description: "İnovatif çözümler geliştiren takım"
  },
  {
    id: 3,
    name: "YZT HAVA SAVUNMA",
    status: "active",
    color: "from-green-500 to-emerald-500",
    icon: Award,
    description: "Havacılık ve savunma teknolojileri uzmanları"
  },
  {
    id: 4,
    name: "YZT AITOLIA",
    status: "active",
    color: "from-orange-500 to-red-500",
    icon: Star,
    description: "Yapay zeka ve makine öğrenmesi takımı"
  },
  {
    id: 5,
    name: "YZT EĞİTİMDE YAPAY ZEKA",
    status: "active",
    color: "from-indigo-500 to-blue-500",
    icon: Rocket,
    description: "Eğitim teknolojileri ve yapay zeka çözümleri"
  },
  {
    id: 6,
    name: "YZT HERDAI",
    status: "active",
    color: "from-teal-500 to-cyan-500",
    icon: Zap,
    description: "Yenilikçi AI projeleri geliştiren takım"
  },
  {
    id: 7,
    name: "YZT ARTİN",
    status: "active",
    color: "from-violet-500 to-purple-500",
    icon: Target,
    description: "Yapay zeka ve teknoloji alanında inovatif projeler geliştiren takım"
  }
];

// Takım isimlerinden role mapping
const getTeamRole = (teamName: string): string | null => {
  const teamRoleMap: Record<string, string> = {
    'YZT TALOS': 'talos-team-member',
    'YZT MEVZU': 'mevzu-team-member',
    'YZT HAVA SAVUNMA': 'hava-savunma-team-member',
    'YZT AITOLIA': 'aitolia-team-member',
    'YZT EĞİTİMDE YAPAY ZEKA': 'egitimde-yapay-zeka-team-member',
    'YZT HERDAI': 'herdai-team-member',
    'YZT ARTİN': 'artin-team-member',
  };
  return teamRoleMap[teamName] || null;
};

// Takım seçenekleri
const TEAM_OPTIONS = [
  'YZT TALOS',
  'YZT MEVZU',
  'YZT HAVA SAVUNMA',
  'YZT AITOLIA',
  'YZT EĞİTİMDE YAPAY ZEKA',
  'YZT HERDAI',
  'YZT ARTİN',
];

export default function TeamsPage() {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState<{ name: string; role: string } | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCaptainsDialogOpen, setIsCaptainsDialogOpen] = useState(false);
  const [captainTeamAssignments, setCaptainTeamAssignments] = useState<Record<string, string>>({});
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [isTasksDialogOpen, setIsTasksDialogOpen] = useState(false);
  const [selectedTeamForChat, setSelectedTeamForChat] = useState<{ name: string; role: string } | null>(null);
  const [selectedTeamForTasks, setSelectedTeamForTasks] = useState<{ name: string; role: string } | null>(null);
  const [chatMessage, setChatMessage] = useState('');

  const userProfileRef = useMemoFirebase(() => 
    (user && firestore) ? doc(firestore, 'users', user.uid) : null, 
    [user, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  // Seçili takımın üyelerini çek
  const teamMembersQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTeam?.role) return null;
    return query(
      collection(firestore, 'users'),
      where('role', '==', selectedTeam.role)
    );
  }, [firestore, selectedTeam?.role]);
  
  const { data: teamMembers, isLoading: isMembersLoading } = useCollection<UserProfile>(teamMembersQuery);

  // Tüm takım üyelerini çek (tüm takım rolleri için)
  const allTeamMembersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const teamRoles = [
      'talos-team-member',
      'mevzu-team-member',
      'hava-savunma-team-member',
      'aitolia-team-member',
      'egitimde-yapay-zeka-team-member',
      'herdai-team-member',
      'artin-team-member',
      'team-captain'
    ];
    // Firestore'da 'in' operatörü ile birden fazla role query yapabiliriz
    return query(
      collection(firestore, 'users'),
      where('role', 'in', teamRoles)
    );
  }, [firestore]);
  
  const { data: allTeamMembers } = useCollection<UserProfile>(allTeamMembersQuery);

  // Takım kaptanlarını çek
  const captainsQuery = useMemoFirebase(() => 
    firestore ? query(
      collection(firestore, 'users'),
      where('role', '==', 'team-captain')
    ) : null,
    [firestore]
  );
  const { data: captains, isLoading: isCaptainsLoading } = useCollection<UserProfile>(captainsQuery);
  
  // Kaptanları alfabetik sırala (client-side)
  const sortedCaptains = useMemo(() => {
    if (!captains) return [];
    return [...captains].sort((a, b) => {
      const nameA = a.displayName ?? a.email ?? '';
      const nameB = b.displayName ?? b.email ?? '';
      return nameA.localeCompare(nameB, 'tr');
    });
  }, [captains]);

  // Takım üye sayılarını hesapla
  const getTeamMemberCount = (teamName: string): number => {
    if (!allTeamMembers) return 0;
    const teamRole = getTeamRole(teamName);
    if (!teamRole) return 0;
    
    // Takım üyeleri + kaptanlar (kaptanlar tüm takımlara dahil edilebilir, şimdilik sadece takım üyelerini sayıyoruz)
    return allTeamMembers.filter(member => member.role === teamRole).length;
  };

  // Kaptanlar dialog'u açıldığında mevcut atamaları yükle
  useEffect(() => {
    if (isCaptainsDialogOpen && sortedCaptains) {
      const assignments: Record<string, string> = {};
      sortedCaptains.forEach(captain => {
        if (captain.teamName) {
          assignments[captain.id] = captain.teamName;
        }
      });
      setCaptainTeamAssignments(assignments);
    }
  }, [isCaptainsDialogOpen, sortedCaptains]);

  // Kaptan takım atamasını kaydet
  const handleSaveCaptainAssignment = async (captainId: string, teamName: string) => {
    if (!firestore) return;

    try {
      const captainRef = doc(firestore, 'users', captainId);
      // "none" değerini null'a çevir
      const finalTeamName = teamName === 'none' ? null : (teamName || null);
      await updateDoc(captainRef, {
        teamName: finalTeamName,
      });

      setCaptainTeamAssignments(prev => ({
        ...prev,
        [captainId]: teamName,
      }));

      toast({
        title: 'Kaydedildi',
        description: `Kaptan ${finalTeamName ? finalTeamName + ' takımına' : 'takımsız'} atandı.`,
      });
    } catch (error) {
      console.error('Kaptan ataması kaydetme hatası:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Kaptan ataması kaydedilirken bir hata oluştu.',
      });
    }
  };

  // Seçili takımın sohbet mesajlarını çek
  const teamChatQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTeamForChat) return null;
    return query(
      collection(firestore, 'teamChat'),
      where('teamRole', '==', selectedTeamForChat.role),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, selectedTeamForChat]);
  
  const { data: teamChatMessages, isLoading: isChatLoading } = useCollection<TeamChatMessage>(teamChatQuery);

  // Seçili takımın görevlerini çek
  const teamTasksQuery = useMemoFirebase(() => {
    if (!firestore || !selectedTeamForTasks) return null;
    return query(
      collection(firestore, 'tasks'),
      where('teamRole', '==', selectedTeamForTasks.role),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, selectedTeamForTasks]);
  
  const { data: teamTasks, isLoading: isTasksLoading } = useCollection<Task>(teamTasksQuery);

  // Görevleri status'a göre grupla
  const tasksByStatus = useMemo(() => {
    if (!teamTasks) return { todo: [], 'in-progress': [], done: [] };
    
    return {
      todo: teamTasks.filter(t => t.status === 'todo'),
      'in-progress': teamTasks.filter(t => t.status === 'in-progress'),
      done: teamTasks.filter(t => t.status === 'done'),
    };
  }, [teamTasks]);

  // Sohbet mesajı gönder
  const handleSendChatMessage = async () => {
    if (!firestore || !user || !userProfile || !chatMessage.trim() || !selectedTeamForChat) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Mesaj göndermek için gerekli bilgiler eksik.',
      });
      return;
    }

    try {
      await addDoc(collection(firestore, 'teamChat'), {
        teamRole: selectedTeamForChat.role,
        message: chatMessage.trim(),
        authorId: user.uid,
        authorName: userProfile.displayName ?? 'Öğretmen',
        authorPhotoURL: userProfile.photoURL ?? '',
        createdAt: Timestamp.now(),
      });

      setChatMessage('');
      toast({
        title: 'Mesaj Gönderildi',
        description: 'Mesajınız başarıyla gönderildi.',
      });
    } catch (error: any) {
      console.error('Sohbet mesajı gönderme hatası:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error?.message ?? 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
      });
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  /**
   * Helper: Get user initials from name
   */
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Helper: Render team members list with proper conditional logic
   */
  const renderTeamMembers = () => {
    if (isMembersLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      );
    }

    if (!teamMembers || teamMembers.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Bu takımda henüz üye bulunmuyor.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {teamMembers.map((member) => {
          const initials = getInitials(member.displayName);
          
          return (
            <Card key={member.id} className="bg-white/90 backdrop-blur-md border border-white/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.photoURL ?? ''} alt={member.displayName ?? ''} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.displayName ?? 'İsimsiz'}</div>
                      <div className="text-sm text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {getRoleDisplayName(member.role)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  /**
   * Helper: Render chat messages list with proper conditional logic
   */
  const renderChatMessages = () => {
    if (isChatLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      );
    }

    if (!teamChatMessages || teamChatMessages.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Henüz mesaj yok. İlk mesajı siz gönderin!
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {teamChatMessages.map((message) => {
          const initials = getInitials(message.authorName);
          const messageDate = message.createdAt?.toDate?.() ?? new Date();
          
          return (
            <div key={message.id} className="flex gap-3">
              <Avatar>
                <AvatarImage src={message.authorPhotoURL ?? ''} alt={message.authorName ?? ''} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{message.authorName ?? 'İsimsiz'}</span>
                  <span className="text-xs text-muted-foreground">
                    {messageDate.toLocaleString('tr-TR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{message.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleCaptainTeamChange = (captainId: string, value: string) => {
    setCaptainTeamAssignments(prev => ({
      ...prev,
      [captainId]: value,
    }));
  };

  /**
   * Helper: Render captains list with proper conditional logic
   */
  const renderCaptains = () => {
    if (isCaptainsLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      );
    }

    if (!sortedCaptains || sortedCaptains.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Henüz takım kaptanı bulunmuyor.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sortedCaptains.map((captain) => {
          const initials = getInitials(captain.displayName);
          const currentTeamName = captainTeamAssignments[captain.id] ?? captain.teamName;
          const assignedTeam = currentTeamName ?? 'none';
          
          return (
            <Card key={captain.id} className="bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar>
                      <AvatarImage src={captain.photoURL ?? ''} alt={captain.displayName ?? ''} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{captain.displayName ?? 'İsimsiz'}</div>
                      <div className="text-sm text-muted-foreground">{captain.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <Select
                      value={assignedTeam}
                      onValueChange={(value) => handleCaptainTeamChange(captain.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Takım seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Takımsız</SelectItem>
                        {TEAM_OPTIONS.map((team) => (
                          <SelectItem key={team} value={team}>
                            {team}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleSaveCaptainAssignment(captain.id, assignedTeam)}
                      disabled={assignedTeam === (captain.teamName ?? 'none')}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Sadece öğretmenler erişebilir
    if (userProfile && userProfile.role?.trim() !== 'teacher') {
      router.push('/dashboard');
    }
  }, [isLoading, user, router, userProfile]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user || userProfile?.role?.trim() !== 'teacher') {
    return null; // useEffect zaten yönlendirecek
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
          Takımlar
        </h1>
        <p className="text-slate-600">
          Tüm takımları görüntüleyin ve performanslarını takip edin
        </p>
      </div>

      {/* Takım Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const IconComponent = team.icon;
          return (
            <Card 
              key={team.id} 
              className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-12 h-12 bg-gradient-to-r ${team.color} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <Badge 
                    variant={team.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {team.status === 'active' ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{team.name}</CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Üye Sayısı */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users2 className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">Üye Sayısı</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{getTeamMemberCount(team.name)}</span>
                  </div>

                  {/* Butonlar */}
                  <div className="space-y-2 pt-2">
                    {/* İlk satır: Görüntüle ve Düzenle */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          const teamRole = getTeamRole(team.name);
                          if (teamRole) {
                            setSelectedTeam({ name: team.name, role: teamRole });
                            setIsViewDialogOpen(true);
                          }
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Görüntüle
                      </Button>
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => {
                          // Takım düzenleme fonksiyonu gelecekte eklenecek
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Düzenle
                      </Button>
                    </div>
                    {/* İkinci satır: Sohbet ve Görevler */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          const teamRole = getTeamRole(team.name);
                          if (teamRole) {
                            setSelectedTeamForChat({ name: team.name, role: teamRole });
                            setIsChatDialogOpen(true);
                          }
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Sohbet
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          const teamRole = getTeamRole(team.name);
                          if (teamRole) {
                            setSelectedTeamForTasks({ name: team.name, role: teamRole });
                            setIsTasksDialogOpen(true);
                          }
                        }}
                      >
                        <CheckSquare2 className="w-4 h-4 mr-2" />
                        Görevler
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alt Kısım Kartları */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kaptanlar Kartı */}
        <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <UserCog className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl">Kaptanlar</CardTitle>
            <CardDescription>Takım kaptanlarını yönet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setIsCaptainsDialogOpen(true)}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Kaptanları Görüntüle
            </Button>
          </CardContent>
        </Card>

        {/* Ayarlar Kartı */}
        <Card className="bg-white/90 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl">Ayarlar</CardTitle>
            <CardDescription>Takım ayarlarını düzenle</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                // Takım ayarları fonksiyonu gelecekte eklenecek
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Ayarları Aç
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Takım Üyelerini Görüntüleme Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTeam?.name} - Takım Üyeleri</DialogTitle>
            <DialogDescription>
              Bu takımdaki tüm üyeleri görüntüleyebilirsiniz
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {renderTeamMembers()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Takım Sohbet Dialog */}
      <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTeamForChat?.name} - Sohbet</DialogTitle>
            <DialogDescription>
              Takım üyeleriyle mesajlaşın
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-[400px] max-h-[500px] pr-4">
            {renderChatMessages()}
          </ScrollArea>
          
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="Mesajınızı yazın..."
              className="flex-1"
            />
            <Button onClick={handleSendChatMessage} disabled={!chatMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Takım Görevler Dialog */}
      <Dialog open={isTasksDialogOpen} onOpenChange={setIsTasksDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTeamForTasks?.name} - Görevler</DialogTitle>
            <DialogDescription>
              Takım görevlerini görüntüleyin
            </DialogDescription>
          </DialogHeader>
          
          {isTasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* Yapılacaklar */}
              <div className="space-y-3">
                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Yapılacaklar ({tasksByStatus.todo.length})
                </div>
                {tasksByStatus.todo.map((task) => {
                  const assignedNames = task.assignedToNames && task.assignedToNames.length > 0
                    ? task.assignedToNames.join(', ')
                    : task.assignedToName;
                  return (
                    <Card key={task.id} className="bg-slate-50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {assignedNames && (
                              <span>Atanan: {assignedNames}</span>
                            )}
                            {task.dueDate && (
                              <span>
                                Bitiş: {task.dueDate.toDate?.().toLocaleDateString('tr-TR')}
                              </span>
                            )}
                            {task.steps && task.steps.length > 0 && (
                              <span>
                                Adımlar: {task.steps.filter(s => s.completed).length}/{task.steps.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {tasksByStatus.todo.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Görev yok
                  </div>
                )}
              </div>

              {/* Devam Ediyor */}
              <div className="space-y-3">
                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Devam Ediyor ({tasksByStatus['in-progress'].length})
                </div>
                {tasksByStatus['in-progress'].map((task) => {
                  const assignedNames = task.assignedToNames && task.assignedToNames.length > 0
                    ? task.assignedToNames.join(', ')
                    : task.assignedToName;
                  return (
                    <Card key={task.id} className="bg-blue-50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {assignedNames && (
                              <span>Atanan: {assignedNames}</span>
                            )}
                            {task.dueDate && (
                              <span>
                                Bitiş: {task.dueDate.toDate?.().toLocaleDateString('tr-TR')}
                              </span>
                            )}
                            {task.steps && task.steps.length > 0 && (
                              <span>
                                Adımlar: {task.steps.filter(s => s.completed).length}/{task.steps.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {tasksByStatus['in-progress'].length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Görev yok
                  </div>
                )}
              </div>

              {/* Tamamlandı */}
              <div className="space-y-3">
                <div className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Tamamlandı ({tasksByStatus.done.length})
                </div>
                {tasksByStatus.done.map((task) => {
                  const assignedNames = task.assignedToNames && task.assignedToNames.length > 0
                    ? task.assignedToNames.join(', ')
                    : task.assignedToName;
                  return (
                    <Card key={task.id} className="bg-green-50">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm line-through">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 line-through">{task.description}</p>
                          )}
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            {assignedNames && (
                              <span>Atanan: {assignedNames}</span>
                            )}
                            {task.dueDate && (
                              <span>
                                Bitiş: {task.dueDate.toDate?.().toLocaleDateString('tr-TR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {tasksByStatus.done.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Görev yok
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Kaptanlar Yönetim Dialog */}
      <Dialog open={isCaptainsDialogOpen} onOpenChange={setIsCaptainsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Takım Kaptanları Yönetimi</DialogTitle>
            <DialogDescription>
              Kaptanları görüntüleyin ve takımlara atayın
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {renderCaptains()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

