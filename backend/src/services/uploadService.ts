import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3 } from '../config/aws';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export const uploadService = {
  async getPresignedUploadUrl(filename: string, mimeType: string, taskId: string) {
    const ext = filename.split('.').pop();
    const key = `tasks/${taskId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_ATTACHMENTS,
      Key: key,
      ContentType: mimeType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { url, key, filename };
  },

  /** Genera una URL pre-firmada de descarga (GET) para un adjunto privado. */
  async getPresignedDownloadUrl(key: string, filename?: string) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_ATTACHMENTS,
      Key: key,
      // Fuerza la descarga con el nombre original del archivo
      ...(filename
        ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
        : {}),
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    return { url, expiresIn: 300 };
  },

  async deleteFile(key: string) {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET_ATTACHMENTS,
        Key: key,
      })
    );
  },

  getPublicUrl(key: string) {
    return `https://${env.S3_BUCKET_ATTACHMENTS}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  },
};
