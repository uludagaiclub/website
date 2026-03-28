import { useState, useCallback, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { Assignment, UserProfile } from '@/types';
import type { useToast } from '@/lib/use-toast';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const MAX_ASSIGNMENT_DOWNLOADS = 10;
const DEFAULT_ASSIGNMENT_FILENAME = 'assignment.ipynb';
const DEFAULT_RESOURCE_FILENAME = 'dataset.csv';

type ToastFn = ReturnType<typeof useToast>['toast'];

type DownloadResult = {
    downloadUrl: string;
    fileName?: string | null;
};

type UseAssignmentDownloadsArgs = {
    user: User | null;
    userProfile: UserProfile | null;
    toast: ToastFn;
};

const createDownloadLink = (href: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);
};

const triggerBlobDownload = async (url: string, fileName: string) => {
    const fileResponse = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
    });

    if (!fileResponse.ok) {
        throw new Error(`Dosya indirilemedi: ${fileResponse.status}`);
    }

    const blob = await fileResponse.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    createDownloadLink(objectUrl, fileName);
    setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
    }, 100);
};

const downloadWithFallback = async ({
    url,
    fileName,
    fallbackName
}: {
    url: string;
    fileName?: string | null;
    fallbackName: string;
}) => {
    const resolvedName = fileName ?? fallbackName;
    try {
        // Önce blob download dene (tercih edilen yöntem)
        await triggerBlobDownload(url, resolvedName);
    } catch (blobError) {
        // Blob download başarısız olursa, URL'yi doğrudan kullan ama download attribute ile
        // Bu, tarayıcının dosyayı açmak yerine indirmesini sağlar
        console.warn('Blob download failed, trying direct download with download attribute:', blobError);
        try {
            createDownloadLink(url, resolvedName);
        } catch (directError) {
            // Son çare: yeni pencerede aç
            console.error('Direct download also failed:', directError);
            window.open(url, '_blank');
            throw new Error('Dosya indirilemedi. Lütfen tekrar deneyin.');
        }
    }
};

const parseErrorResponse = async (response: Response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const requestDownloadPayload = async ({
    endpoint,
    token,
    errorMessage
}: {
    endpoint: string;
    token: string;
    errorMessage: string;
}): Promise<DownloadResult> => {
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorResult = await parseErrorResponse(response);
        throw new Error(errorResult?.error ?? errorMessage);
    }

    return response.json();
};

export const useAssignmentDownloads = ({
    user,
    userProfile,
    toast
}: UseAssignmentDownloadsArgs) => {
    const { firestore } = useFirebase();
    const [studentDownloadCounts, setStudentDownloadCounts] = useState<Record<string, number>>({});
    const [isLoadingCounts, setIsLoadingCounts] = useState(true);

    // Firestore'dan indirme sayılarını yükle
    useEffect(() => {
        const loadDownloadCounts = async () => {
            if (!firestore || !user || !userProfile || userProfile.role?.trim().toLowerCase() !== 'student') {
                setIsLoadingCounts(false);
                return;
            }

            try {
                const downloadsQuery = query(
                    collection(firestore, 'assignmentDownloads'),
                    where('studentId', '==', user.uid)
                );
                const snapshot = await getDocs(downloadsQuery);
                
                const counts: Record<string, number> = {};
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const assignmentId = data.assignmentId;
                    if (assignmentId) {
                        const downloadKey = `${user.uid}_${assignmentId}`;
                        counts[downloadKey] = (counts[downloadKey] ?? 0) + 1;
                    }
                });

                setStudentDownloadCounts(counts);
            } catch (error) {
                console.error('Error loading download counts:', error);
            } finally {
                setIsLoadingCounts(false);
            }
        };

        loadDownloadCounts();
    }, [firestore, user, userProfile]);

    const incrementStudentDownloadCount = useCallback(
        (assignmentId: string) => {
            const normalizedRole = userProfile?.role?.trim().toLowerCase();
            if (normalizedRole !== 'student' || !user) {
                return;
            }
            const downloadKey = `${user.uid}_${assignmentId}`;
            setStudentDownloadCounts((prev) => ({
                ...prev,
                [downloadKey]: (prev[downloadKey] ?? 0) + 1
            }));
        },
        [userProfile, user]
    );

    const getUserToken = useCallback(async () => {
        if (!user) {
            throw new Error('Kullanıcı oturumu bulunamadı.');
        }
        return user.getIdToken();
    }, [user]);

    const handleDownloadError = useCallback(
        (error: unknown, fallbackMessage: string) => {
            const message = error instanceof Error ? error.message : fallbackMessage;
            toast({
                title: 'Hata!',
                description: message || fallbackMessage,
                variant: 'destructive'
            });
        },
        [toast]
    );

    const handleAssignmentFileDownload = useCallback(
        async (assignment: Assignment, fileIndex: number = 0) => {
            try {
                const token = await getUserToken();
                
                // Stream modunda dosyayı doğrudan indir
                const response = await fetch(`/api/assignments/${assignment.id}/download?stream=true&fileIndex=${fileIndex}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorResult = await parseErrorResponse(response);
                    throw new Error(errorResult?.error ?? 'Dosya indirilemedi.');
                }

                // İndirme başarılı oldu, sayacı güncelle (backend zaten Firestore'a kaydetti)
                incrementStudentDownloadCount(assignment.id);

                // Content-Disposition header'ından dosya adını al
                const contentDisposition = response.headers.get('Content-Disposition');
                let fileName = DEFAULT_ASSIGNMENT_FILENAME;
                if (contentDisposition) {
                    const fileNameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                    if (fileNameMatch?.[1]) {
                        fileName = fileNameMatch[1].replace(/['"]/g, '');
                        // URL decode
                        try {
                            fileName = decodeURIComponent(fileName);
                        } catch {
                            // Decode başarısız olursa olduğu gibi kullan
                        }
                    }
                }

                // Blob olarak indir
                const blob = await response.blob();
                const objectUrl = window.URL.createObjectURL(blob);
                createDownloadLink(objectUrl, fileName);
                setTimeout(() => {
                    window.URL.revokeObjectURL(objectUrl);
                }, 100);
                
                // Show success message with remaining downloads (only for students)
                const normalizedRole = userProfile?.role?.trim().toLowerCase();
                if (normalizedRole === 'student') {
                    toast({
                        title: "Dosya İndirildi!",
                        description: "Ödev dosyası başarıyla indirildi.",
                    });
                }
            } catch (error) {
                handleDownloadError(error, 'Dosya indirilemedi.');
            }
        },
        [getUserToken, incrementStudentDownloadCount, handleDownloadError, userProfile, toast]
    );

    const handleResourceFileDownload = useCallback(
        async (assignment: Assignment, fileIndex: number = 0) => {
            try {
                const token = await getUserToken();
                
                // Stream modunda dosyayı doğrudan indir
                const response = await fetch(`/api/assignments/${assignment.id}/download?fileType=resource&stream=true&fileIndex=${fileIndex}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorResult = await parseErrorResponse(response);
                    throw new Error(errorResult?.error ?? 'CSV dosyası indirilemedi.');
                }

                // İndirme başarılı oldu, sayacı güncelle (backend zaten Firestore'a kaydetti)
                incrementStudentDownloadCount(assignment.id);

                // Content-Disposition header'ından dosya adını al
                const contentDisposition = response.headers.get('Content-Disposition');
                let fileName = DEFAULT_RESOURCE_FILENAME;
                if (contentDisposition) {
                    const fileNameMatch = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                    if (fileNameMatch?.[1]) {
                        fileName = fileNameMatch[1].replace(/['"]/g, '');
                        // URL decode
                        try {
                            fileName = decodeURIComponent(fileName);
                        } catch {
                            // Decode başarısız olursa olduğu gibi kullan
                        }
                    }
                }

                // Blob olarak indir
                const blob = await response.blob();
                const objectUrl = window.URL.createObjectURL(blob);
                createDownloadLink(objectUrl, fileName);
                setTimeout(() => {
                    window.URL.revokeObjectURL(objectUrl);
                }, 100);
            } catch (error) {
                handleDownloadError(error, 'CSV dosyası indirilemedi.');
            }
        },
        [getUserToken, incrementStudentDownloadCount, handleDownloadError]
    );

    // Yükleme yapıldığında da indirme sayısını artır (backend zaten Firestore'a kaydetti)
    const incrementDownloadCountForSubmission = useCallback(
        (assignmentId: string) => {
            incrementStudentDownloadCount(assignmentId);
        },
        [incrementStudentDownloadCount]
    );

    return {
        studentDownloadCounts,
        isLoadingCounts,
        handleAssignmentFileDownload,
        handleResourceFileDownload,
        incrementDownloadCountForSubmission
    };
};

