
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/lib/use-toast'
import { Logo } from '@/components/logo'
import { signInWithGoogleAndAssignRole } from '@/firebase/auth'
import { useFirebase } from '@/firebase'

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.244,44,30.036,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [kvkkAccepted, setKvkkAccepted] = useState(false)
  const { user, isUserLoading } = useFirebase()

  // Eğer kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isUserLoading, router])

  async function handleGoogleSignIn() {
    if (isSigningIn) return
    
    // KVKK onay kontrolü
    if (!kvkkAccepted) {
      toast({
        variant: 'destructive',
        title: 'KVKK Onayı Gerekli',
        description: 'Devam edebilmek için KVKK Aydınlatma Metni\'ni kabul etmelisiniz.',
      });
      return
    }

    setIsSigningIn(true)
    try {
      await signInWithGoogleAndAssignRole();
      toast({
        title: 'Hesap oluşturuldu ve giriş yapıldı!',
        description: 'Google ile devam ediliyor ve panele yönlendiriliyorsunuz.',
      });
      router.push('/dashboard');
    } catch (error: any) {
      if (error?.code === 'auth/cancelled-popup-request') {
        setIsSigningIn(false)
        return
      }
       toast({
        variant: 'destructive',
        title: 'Google ile kayıt başarısız.',
        description: error.message,
      });
      setIsSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
            <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-6">
                <Logo />
            </Link>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
            Topluluğa Katılın
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Başlamak için Google hesabınızla devam edin.
          </p>
        </div>

        {/* KVKK Onay Checkbox */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Checkbox
              id="kvkk-consent"
              checked={kvkkAccepted}
              onCheckedChange={(checked) => setKvkkAccepted(checked === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="kvkk-consent"
              className="text-sm text-foreground leading-relaxed cursor-pointer flex-1"
            >
              <span className="font-medium">KVKK Aydınlatma Metni</span>'ni okudum ve kişisel verilerimin işlenmesine onay veriyorum.{' '}
              <Link
                href="/kvkk"
                target="_blank"
                className="text-primary hover:underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                Metni oku
              </Link>
            </label>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGoogleSignIn} 
            disabled={isSigningIn || !kvkkAccepted}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Google ile Kayıt Ol
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground mt-4">
            Zaten bir hesabınız var mı?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Giriş Yapın
            </Link>
        </div>
      </div>
    </div>
  )
}
