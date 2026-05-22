import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

function extensionFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  if (fromName) return fromName.toLowerCase();
  const fromType = file.type.split('/')[1];
  return fromType || 'jpg';
}

// Uploads a receipt/map image and returns its storage path.
export async function uploadImage(
  uid: string,
  reportId: string,
  folder: 'receipts' | 'maps',
  file: File,
): Promise<string> {
  const path = `users/${uid}/reports/${reportId}/${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, { contentType: file.type || 'image/jpeg' });
  return path;
}

export async function getImageUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

export async function deleteImage(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Object may already be gone; ignore.
  }
}
