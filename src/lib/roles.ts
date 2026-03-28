import type { UserRole } from '@/types';

/**
 * Tüm kullanıcı rolleri
 */
export const USER_ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

/**
 * Rol görünen isimleri (Türkçe)
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'teacher': 'Öğretmen',
  'student': 'Öğrenci',
};

/**
 * Rolün öğretmen olup olmadığını kontrol eder
 */
export function isTeacher(role: UserRole | null | undefined): boolean {
  return role === 'teacher';
}

/**
 * Rolün öğrenci olup olmadığını kontrol eder
 */
export function isStudent(role: UserRole | null | undefined): boolean {
  return role === 'student';
}

/**
 * Rolün görünen ismini döndürür
 */
export function getRoleDisplayName(role: UserRole | null | undefined): string {
  if (!role) return 'Bilinmeyen';
  return ROLE_DISPLAY_NAMES[role] || role;
}

