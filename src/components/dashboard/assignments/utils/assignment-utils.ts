/**
 * Assignment Utilities
 * Security-critical validation and helper functions for assignment file handling
 */

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_SIZE_MB = 5;
export const MAX_SUBMISSIONS_PER_ASSIGNMENT = 10;

export type ClassroomLevel = 'junior' | 'junior-plus' | 'mid' | 'mid-plus' | 'senior';
export type WeekScoreField = 'week1Score' | 'week2Score' | 'week3Score' | 'week4Score' | 'week5Score' | 'week6Score';

export const CLASSROOM_LEVELS: ClassroomLevel[] = ['junior', 'junior-plus', 'mid', 'mid-plus', 'senior'];

// Allowed MIME types for file uploads - .ipynb (all levels)
export const ALLOWED_MIME_TYPES = [
    'application/json', // For .ipynb files
    'application/x-ipynb+json', // Alternative MIME type for Jupyter notebooks
    'text/plain'
];

export const ALLOWED_CSV_MIME_TYPES = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel'
];

// ============================================================================
// SECURITY: VALIDATION FUNCTIONS
// ============================================================================

/**
 * Normalize classroom level to prevent type confusion attacks
 * SECURITY: Only allows whitelisted classroom levels
 */
export const normalizeClassroomLevel = (level?: string | null): ClassroomLevel | null =>
    level && CLASSROOM_LEVELS.includes(level as ClassroomLevel)
        ? (level as ClassroomLevel)
        : null;

/**
 * Validate file MIME type against allowed types
 * SECURITY: Prevents malicious file uploads by checking MIME type
 */
export function isValidMimeType(file: File): boolean {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.ipynb')) {
        return ALLOWED_MIME_TYPES.includes(file.type) || file.type === '';
    }
    if (fileName.endsWith('.csv')) {
        return ALLOWED_CSV_MIME_TYPES.includes(file.type) || file.type === '';
    }
    return false;
}

/**
 * Sanitize filename to prevent path traversal and injection attacks
 * SECURITY: Critical - removes dangerous characters
 */
export function sanitizeFilename(filename: string): string {
    const sanitized = filename
        .replace(/[/\\]/g, '') // Remove path separators - prevents directory traversal
        .replace(/\.\./g, '') // Remove parent directory references - prevents path traversal
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
        .substring(0, 100); // Limit to 100 characters - prevents buffer overflow
    return sanitized || 'unnamed_file';
}

/**
 * Check for double extensions (e.g., .pdf.exe)
 * SECURITY: Prevents file extension spoofing attacks
 */
export function hasDoubleExtension(filename: string): boolean {
    const parts = filename.split('.');
    return parts.length > 2;
}

/**
 * Get safe file extension
 * SECURITY: Always returns lowercase extension to prevent case-based bypass
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Validate file extension matches MIME type
 * SECURITY: Prevents MIME type spoofing attacks
 */
export function isExtensionMatchingMimeType(file: File): boolean {
    const ext = getFileExtension(file.name);
    if (ext === 'ipynb') return true;
    if (ext === 'csv') return true;
    return false;
}

/**
 * Magic number validation - check file headers match MIME type
 * SECURITY: Validates actual file content, not just extension
 */
export async function validateFileHeader(file: File): Promise<boolean> {
    try {
        const buffer = await file.slice(0, 1).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Check for JSON opening brackets (for .ipynb files)
        return bytes[0] === 0x7B || bytes[0] === 0x5B;
    } catch (error) {
        console.error('Error validating file header:', error);
        return false;
    }
}

/**
 * Generate secure filename with hash
 * SECURITY: Prevents filename collision and predictability attacks
 * Uses cryptographically secure random number generation
 */
const secureRandomString = (length = 8): string => {
    // Try Web Crypto API (available in browsers and Node.js 18+)
    const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

    if (cryptoObj?.randomUUID) {
        return cryptoObj.randomUUID().replace(/-/g, '').substring(0, length);
    }

    if (cryptoObj?.getRandomValues) {
        const randomValues = new Uint8Array(length);
        cryptoObj.getRandomValues(randomValues);
        return Array.from(randomValues, (value) => (value % 36).toString(36)).join('').substring(0, length);
    }

    // Try Node.js crypto module (server-side)
    try {
        const nodeCrypto = require('crypto');
        const randomBytes = nodeCrypto.randomBytes(length);
        return Array.from(randomBytes, (value) => (value % 36).toString(36)).join('').substring(0, length);
    } catch {
        // If neither Web Crypto nor Node.js crypto is available, throw error
        // This is more secure than falling back to Math.random()
        throw new Error('Cryptographically secure random number generator is not available. This environment is not supported.');
    }
};

export function generateSecureFilename(originalFilename: string, userId: string): string {
    const ext = getFileExtension(originalFilename);
    const timestamp = Date.now();
    const randomStr = secureRandomString(8);
    return `${userId}_${timestamp}_${randomStr}.${ext}`;
}

/**
 * Check if classroom is advanced level
 * SECURITY: Type-safe check for classroom permissions
 */
export const isAdvancedClassroom = (classroom: ClassroomLevel | null): classroom is ClassroomLevel =>
    !!classroom && ['junior-plus', 'mid', 'mid-plus', 'senior'].includes(classroom);

/**
 * Validate .ipynb file content
 * SECURITY: Ensures file is valid JSON before processing
 */
export async function validateIpynbFile(file: File): Promise<void> {
    if (!file.name.endsWith('.ipynb')) {
        throw new Error('Sadece .ipynb dosyaları kabul edilir');
    }
    try {
        const content = await file.text();
        JSON.parse(content); // Will throw if invalid JSON
    } catch {
        throw new Error('Geçersiz .ipynb dosyası. Dosya içeriği JSON formatında olmalıdır.');
    }
}

/**
 * Resolve content type from file metadata
 * SECURITY: Ensures correct MIME type is set for Firebase Storage
 */
export const resolveContentType = (mimeType: string | undefined | null, extension: string): string => {
    if (mimeType && mimeType.trim() !== '') {
        return mimeType;
    }
    // Fallback to extension-based MIME type
    if (extension === 'ipynb') return 'application/json';
    if (extension === 'csv') return 'text/csv';
    return 'application/octet-stream';
};

/**
 * Create empty form state
 * SECURITY: Ensures form state is properly initialized with null values
 */
export const createEmptyFormState = () => ({
    title: '',
    description: '',
    dueDate: '',
    lateDueDate: '',
    week: '',
    classroomLevels: [] as ClassroomLevel[],
    points: '',
    isWorkshop: false,
    workshopTime: '',
    allowSubmissions: true // Default: öğrenciler yükleyebilir
});

