export interface CloudinaryMetadata {
  secure_url: string;
  public_id: string;
  original_filename: string;
  created_at: string;
}

/**
 * Uploads an image (file, blob, or base64 Data URL) to Cloudinary.
 * Uses unsigned upload to securely upload directly from the frontend.
 */
export async function uploadImageToCloudinary(
  fileOrBase64: string | File | Blob,
  fileName: string = 'image.jpg'
): Promise<CloudinaryMetadata> {
  const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || 'dbh7qopzf';
  const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || 'dashboad_CS_ONLINE';

  const formData = new FormData();
  
  if (typeof fileOrBase64 === 'string') {
    // If it's a data URL, we send it as a string
    formData.append('file', fileOrBase64);
  } else {
    // If it's a File or Blob, we append it
    formData.append('file', fileOrBase64, fileName);
  }
  
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'hpi_photos');

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr;
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {
        parsedErr = { error: { message: errText } };
      }
      throw new Error(parsedErr?.error?.message || 'Gagal mengunggah gambar ke Cloudinary');
    }

    const data = await response.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      original_filename: data.original_filename || fileName,
      created_at: data.created_at || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

/**
 * Cleanly mock/log image deletion.
 * (Signed deletion requires API Secret which shouldn't be exposed on client side,
 * so clearing references from Firestore is the standard approach for SPAs).
 */
export async function deleteImageFromCloudinary(publicId: string): Promise<boolean> {
  console.log(`Menghapus file dari Cloudinary dengan public_id: ${publicId} (Referensi dihapus dari database aplikasi)`);
  return true;
}
