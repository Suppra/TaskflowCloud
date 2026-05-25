import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
