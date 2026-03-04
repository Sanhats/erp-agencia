import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Sube un PDF a Cloudinary
 * @param buffer - Buffer del archivo PDF
 * @param folder - Carpeta donde se almacenará (ej: 'pdfs/invoices')
 * @param publicId - ID público opcional (si no se proporciona, se genera automáticamente)
 * @returns URL pública y publicId del archivo subido
 */
export async function uploadPDF(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<UploadResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary no está configurado correctamente. Verifica las variables de entorno.');
  }

  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      resource_type: 'raw',
      folder: folder,
      format: 'pdf',
      use_filename: false,
      unique_filename: true,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
      uploadOptions.overwrite = true;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error(`Error al subir PDF a Cloudinary: ${error.message}`));
          return;
        }

        if (!result) {
          reject(new Error('No se recibió respuesta de Cloudinary'));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Elimina un archivo de Cloudinary
 * @param publicId - ID público del archivo a eliminar
 * @returns true si se eliminó correctamente
 */
export async function deletePDF(publicId: string): Promise<boolean> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary no está configurado correctamente. Verifica las variables de entorno.');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    return result.result === 'ok';
  } catch (error: any) {
    throw new Error(`Error al eliminar PDF de Cloudinary: ${error.message}`);
  }
}

export default cloudinary;
