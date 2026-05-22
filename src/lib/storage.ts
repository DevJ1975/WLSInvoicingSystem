import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { randomUUID } from 'expo-crypto';
import { storage } from './firebase';

function guessExtension(uri: string, mimeType?: string): string {
  if (mimeType && mimeType.includes('/')) {
    const sub = mimeType.split('/')[1];
    if (sub) return sub === 'jpeg' ? 'jpg' : sub;
  }
  const match = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

// Uploads a local image (file URI from the image picker) to Cloud Storage and
// returns its storage path. Works on web and native (both yield a fetchable URI).
export async function uploadImage(
  uid: string,
  reportId: string,
  folder: 'receipts' | 'maps',
  uri: string,
  mimeType?: string,
): Promise<string> {
  const ext = guessExtension(uri, mimeType);
  const path = `users/${uid}/reports/${reportId}/${folder}/${randomUUID()}.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(ref(storage, path), blob, {
    contentType: mimeType || blob.type || 'image/jpeg',
  });
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
