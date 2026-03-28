'use client'

import type { ReactNode } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import type { UserProfile } from "@/types"

type LayoutProps = {
  readonly children: ReactNode;
};

export default function Layout({ children }: Readonly<LayoutProps>) {
  const router = useRouter()
  const { user, isUserLoading, firestore } = useFirebase()
  
  const userProfileRef = useMemoFirebase(() => 
    (user && firestore) ? doc(firestore, 'users', user.uid) : null, 
    [user, firestore]
  )
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef)
  
  const isLoading = isUserLoading || isProfileLoading

  useEffect(() => {
    if (isLoading) return
    
    if (!user) {
      router.push('/login')
      return
    }

    // SECURITY: Only teachers can access /students page
    if (userProfile && userProfile.role?.trim() !== 'teacher') {
      router.push('/dashboard')
    }
  }, [isLoading, user, router, userProfile])

  // Don't render anything if user is not a teacher
  if (isLoading || !user || !userProfile) {
    return (
      <DashboardLayout>
        <div className="flex h-full w-full items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (userProfile.role?.trim() !== 'teacher') {
    return null // useEffect will redirect
  }

  return (
    <DashboardLayout>{children}</DashboardLayout>
  )
}

    