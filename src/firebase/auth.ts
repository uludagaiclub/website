
'use client';

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getSdks } from './index';
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';
import { getClassroomLevelByEmail, getRoleByEmail } from '@/lib/email-to-classroom';
import type { UserProfile } from '@/types';
import type { User } from 'firebase/auth';
import type { DocumentReference } from 'firebase/firestore';

export async function signInWithGoogleAndAssignRole(): Promise<UserProfile | null> {
  const { auth, firestore } = getSdks();
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if (!user) {
      return null;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    return await findOrCreateUserProfile(user, userDocRef);
  } catch (error: any) {
    return handleSignInError(error);
  }
}

export async function signOutUser() {
  const { auth } = getSdks();
  await signOut(auth);
}

function checkRoleUpdateNeeded(userProfile: UserProfile, correctRole: string | null): boolean {
  return !!(correctRole && userProfile.role !== correctRole);
}

function checkClassroomUpdateNeeded(
  userProfile: UserProfile,
  correctClassroom: string | null
): boolean {
  if (!correctClassroom) {
    return false;
  }
      const currentClassroom = userProfile.classroom;
  // Sadece 'new-signup' olan kullanıcılar için email listesindeki seviyeyi otomatik ata
  // Eğer kullanıcı zaten bir seviyeye atanmışsa (öğretmen tarafından manuel olarak),
  // email listesindeki seviyeyi zorla uygulama (öğretmenin manuel atamasını koru)
  return currentClassroom === 'new-signup' || currentClassroom === null || currentClassroom === undefined;
}

function addRoleToUpdateData(
  updateData: Record<string, unknown>,
  correctRole: string | null
): void {
  if (!correctRole) {
    return;
  }
            updateData.role = correctRole;
            if (correctRole === 'teacher') {
              updateData.classroom = null;
            }
          }
          
function addClassroomToUpdateData(
  updateData: Record<string, unknown>,
  correctClassroom: string | null
): void {
  if (correctClassroom) {
            updateData.classroom = correctClassroom;
          }
}

function buildUpdateData(
  needsRoleUpdate: boolean,
  needsClassroomUpdate: boolean,
  correctRole: string | null,
  correctClassroom: string | null
): Record<string, unknown> {
  const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
  
  if (needsRoleUpdate) {
    addRoleToUpdateData(updateData, correctRole);
  }
  
  if (needsClassroomUpdate) {
    addClassroomToUpdateData(updateData, correctClassroom);
  }
  
  return updateData;
}

function getUpdatedRole(
  userProfile: UserProfile,
  correctRole: string | null
): string {
  return correctRole ?? userProfile.role;
}

function getUpdatedClassroom(
  userProfile: UserProfile,
  correctRole: string | null,
  correctClassroom: string | null
): string | null {
  if (correctRole === 'teacher') {
    return null;
  }
  return correctClassroom ?? userProfile.classroom;
}

function buildUpdatedProfile(
  userProfile: UserProfile,
  correctRole: string | null,
  correctClassroom: string | null
): UserProfile {
          return {
            ...userProfile,
    role: getUpdatedRole(userProfile, correctRole),
    classroom: getUpdatedClassroom(userProfile, correctRole, correctClassroom)
  };
}

function getCorrectClassroom(userProfile: UserProfile, email: string): string | null {
  if (userProfile.role !== 'student') {
    return null;
  }
  return getClassroomLevelByEmail(email);
}

function determineUpdateNeeds(
  userProfile: UserProfile,
  email: string
): {
  needsRoleUpdate: boolean;
  needsClassroomUpdate: boolean;
  correctRole: string | null;
  correctClassroom: string | null;
} {
  const correctRole = getRoleByEmail(email);
  const needsRoleUpdate = checkRoleUpdateNeeded(userProfile, correctRole);
  
  const correctClassroom = getCorrectClassroom(userProfile, email);
  const needsClassroomUpdate = checkClassroomUpdateNeeded(userProfile, correctClassroom);
  
  return {
    needsRoleUpdate,
    needsClassroomUpdate,
    correctRole,
    correctClassroom
  };
}

async function performProfileUpdate(
  userDocRef: DocumentReference,
  userProfile: UserProfile,
  updateNeeds: {
    needsRoleUpdate: boolean;
    needsClassroomUpdate: boolean;
    correctRole: string | null;
    correctClassroom: string | null;
  }
): Promise<UserProfile> {
  const updateData = buildUpdateData(
    updateNeeds.needsRoleUpdate,
    updateNeeds.needsClassroomUpdate,
    updateNeeds.correctRole,
    updateNeeds.correctClassroom
  );
  
  await updateDoc(userDocRef, updateData);
  
  return buildUpdatedProfile(
    userProfile,
    updateNeeds.correctRole,
    updateNeeds.correctClassroom
  );
}

async function updateUserProfileIfNeeded(
  user: User,
  userProfile: UserProfile,
  userDocRef: DocumentReference
): Promise<UserProfile> {
  if (!user.email) {
    return userProfile;
          }

  const updateNeeds = determineUpdateNeeds(userProfile, user.email);
  
  if (!updateNeeds.needsRoleUpdate && !updateNeeds.needsClassroomUpdate) {
    return userProfile;
  }

  try {
    return await performProfileUpdate(userDocRef, userProfile, updateNeeds);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Rol/Seviye güncellenemedi:', error);
    }
    return userProfile;
  }
}

async function findOrCreateUserProfile(
  user: User,
  userDocRef: DocumentReference
): Promise<UserProfile> {
  const existingDoc = await fetchUserDocument(userDocRef);
  
  if (!existingDoc.exists()) {
  return createNewUserDocument(user, userDocRef);
  }

  const userData = existingDoc.data();
  const userProfile = { id: existingDoc.id, ...userData } as UserProfile;
  
  return updateUserProfileIfNeeded(user, userProfile, userDocRef);
}

async function fetchUserDocument(userDocRef: DocumentReference) {
  try {
    return await getDoc(userDocRef);
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      throw emitPermissionError({ path: userDocRef.path, operation: 'get' });
    }
    throw error;
  }
}

async function createNewUserDocument(user: User, userDocRef: DocumentReference) {
  const newUserProfile = buildNewUserProfile(user);
  const dataToWrite = {
    ...newUserProfile,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, dataToWrite);
    return { ...newUserProfile, id: user.uid, createdAt: undefined };
  } catch {
    throw emitPermissionError({
      path: userDocRef.path,
      operation: 'create',
      requestResourceData: dataToWrite,
    });
  }
}

function buildNewUserProfile(user: User): Omit<UserProfile, 'id' | 'createdAt'> {
  // Email'e göre rol belirleme (teacher veya student)
  const roleFromEmail = getRoleByEmail(user.email);
  const role = roleFromEmail ?? 'student';
  
  // Email'e göre seviye belirleme (sadece öğrenciler için)
  const classroomLevel = role === 'student' ? getClassroomLevelByEmail(user.email) : null;
  
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: role,
    classroom: role === 'student' 
      ? (classroomLevel ?? 'new-signup') // Öğrenciler için: listedeyse seviyesini ata, yoksa 'new-signup'
      : null, // Teacher'lar için classroom null
  };
}

function handleSignInError(error: any): UserProfile | null {
  if (error instanceof FirestorePermissionError) {
    return null;
  }

  if (error?.code === 'auth/popup-closed-by-user') {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sign-in popup closed by user.');
    }
    return null;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(
      'An error occurred during the Google sign-in or role assignment process:',
      error
    );
  }

  throw error;
}

function emitPermissionError(params: {
  path: string;
  operation: 'get' | 'create';
  requestResourceData?: Record<string, unknown>;
}) {
  const permissionError = new FirestorePermissionError(params);
  errorEmitter.emit('permission-error', permissionError);
  return permissionError;
}
