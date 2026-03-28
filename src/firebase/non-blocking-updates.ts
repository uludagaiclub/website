
'use client';

import {
  DocumentReference,
  CollectionReference,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  DocumentData,
  SetOptions,
} from 'firebase/firestore';
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';

/**
 * Performs a non-blocking `setDoc` operation with optimistic updates.
 * Errors, including permission errors, are caught and emitted globally.
 */
export function setDocumentNonBlocking<T>(
  reference: DocumentReference<T>,
  data: any, // Using 'any' to accommodate different data structures and serverTimestamp
  options: SetOptions = {}
): void {
  const dataWithTimestamp = {
    ...data,
    // Add or update the 'updatedAt' field with the server's timestamp
    updatedAt: serverTimestamp(), 
  };
  
  setDoc(reference, dataWithTimestamp, options).catch((serverError) => {
      const permissionError = new FirestorePermissionError({
        path: reference.path,
        operation: options.merge ? 'update' : 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Performs a non-blocking `addDoc` operation with optimistic updates.
 * Errors, including permission errors, are caught and emitted globally.
 */
export function addDocumentNonBlocking<T>(
  reference: CollectionReference<T>,
  data: any
): void {
  const dataWithTimestamp = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDoc(reference, dataWithTimestamp).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: reference.path,
      operation: 'create',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Performs a non-blocking `updateDoc` operation with optimistic updates.
 * Errors, including permission errors, are caught and emitted globally.
 */
export function updateDocumentNonBlocking(
  reference: DocumentReference,
  data: DocumentData
): void {
  const dataWithTimestamp = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  
  updateDoc(reference, dataWithTimestamp).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: reference.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Performs a non-blocking `deleteDoc` operation with optimistic updates.
 * Errors, including permission errors, are caught and emitted globally.
 */
export function deleteDocumentNonBlocking(
  reference: DocumentReference
): void {
  deleteDoc(reference).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: reference.path,
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}
