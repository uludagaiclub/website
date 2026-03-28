'use client'

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/types";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { useFirebase } from "@/firebase";
import { useToast } from "@/lib/use-toast";

type ExcelRegistrationProps = {
    readonly userProfile: UserProfile | null;
};

export function ExcelRegistration({ userProfile }: Readonly<ExcelRegistrationProps>) {
    const { user } = useFirebase();
    const { toast } = useToast();
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingStudents, setIsExportingStudents] = useState(false);

    const handleImportStudents = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Giriş yapmanız gerekiyor.",
            });
            return;
        }

        setIsImporting(true);

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/students/import', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Öğrenci verileri yüklenirken bir hata oluştu.');
            }

            toast({
                title: "Başarılı!",
                description: data.message || `Öğrenci verileri başarıyla yüklendi. ${data.updated || 0} öğrenci güncellendi, ${data.created || 0} yeni öğrenci eklendi.`,
            });
        } catch (error) {
            console.error('Öğrenci yükleme hatası:', error);
            toast({
                variant: 'destructive',
                title: "Hata",
                description: error instanceof Error ? error.message : "Öğrenci verileri yüklenirken bir hata oluştu.",
            });
        } finally {
            setIsImporting(false);
        }
    };

    const handleExportStudents = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Giriş yapmanız gerekiyor.",
            });
            return;
        }

        setIsExportingStudents(true);

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/students/export', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Öğrenci verileri dışa aktarılırken bir hata oluştu.');
            }

            toast({
                title: "Başarılı!",
                description: data.message || `Öğrenci verileri başarıyla Excel'e aktarıldı. ${data.count || 0} öğrenci işlendi.`,
            });
        } catch (error) {
            console.error('Öğrenci dışa aktarma hatası:', error);
            toast({
                variant: 'destructive',
                title: "Hata",
                description: error instanceof Error ? error.message : "Öğrenci verileri dışa aktarılırken bir hata oluştu.",
            });
        } finally {
            setIsExportingStudents(false);
        }
    };

    const handleExportAssignments = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Giriş yapmanız gerekiyor.",
            });
            return;
        }

        setIsExporting(true);

        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/assignments/export', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ödev dönüşleri dışa aktarılırken bir hata oluştu.');
            }

            toast({
                title: "Başarılı!",
                description: data.message || `Ödev dönüşleri başarıyla Excel'e aktarıldı. ${data.count || 0} kayıt işlendi.`,
            });
        } catch (error) {
            console.error('Ödev dışa aktarma hatası:', error);
            toast({
                variant: 'destructive',
                title: "Hata",
                description: error instanceof Error ? error.message : "Ödev dönüşleri dışa aktarılırken bir hata oluştu.",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg">
            <div className="p-6 border-b border-slate-200/60">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">Excel Kayıt</h2>
                </div>
                <p className="text-slate-600 text-sm">Öğrenci listesi ve ödev dönüşlerini Excel ile yönetin</p>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200/50">
                        <h3 className="font-semibold text-slate-800 mb-2 text-sm">Öğrenci Listesi</h3>
                        <p className="text-xs text-slate-600 mb-4">
                            Sistemdeki öğrenci verilerini Excel'e aktarın veya Excel'den yükleyin.
                            Kolonlar: Öğrenci, Sınıf, Hafta 1-6, WS 1-4
                        </p>
                        <div className="space-y-2">
                            <Button 
                                onClick={handleExportStudents} 
                                disabled={isImporting || isExporting || isExportingStudents}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg"
                            >
                                {isExportingStudents ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Dışa Aktarılıyor...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Öğrenci Listesini Dışa Aktar
                                    </>
                                )}
                            </Button>
                            <Button 
                                onClick={handleImportStudents} 
                                disabled={isImporting || isExporting || isExportingStudents}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Yükleniyor...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Öğrenci Listesi Yükle
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200/50">
                        <h3 className="font-semibold text-slate-800 mb-2 text-sm">Ödev Dönüşleri</h3>
                        <p className="text-xs text-slate-600 mb-4">
                            Tüm ödev dönüşlerini "Ödev Dönüşleri" sayfasına Excel formatında aktarın.
                        </p>
                        <Button 
                            onClick={handleExportAssignments} 
                            disabled={isImporting || isExporting}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 rounded-xl transition-all duration-200 hover:shadow-lg"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Dışa Aktarılıyor...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Ödev Dönüşlerini Dışa Aktar
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

