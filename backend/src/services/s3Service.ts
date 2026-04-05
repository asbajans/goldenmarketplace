import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Uses internal docker networking locally (minio:9000),
// or the public endpoint if specified in production.
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'golden-bucket';

// Check if we're in production to determine S3 endpoint
const isProd = process.env.NODE_ENV === 'production';
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || (isProd ? 'https://s3.asb.web.tr' : 'http://localhost:9100');

// Generate the public URL base for returning formatted URLs
// In production, we assume path-style or virtual-host style fetching works via Cloudflare
const PUBLIC_URL_BASE = process.env.MINIO_PUBLIC_URL || `${MINIO_ENDPOINT}/${BUCKET_NAME}`;

export const s3Client = new S3Client({
  endpoint: process.env.MINIO_INTERNAL_ENDPOINT || 'http://minio:9000', // Connection string for the docker container internally
  region: 'us-east-1', // MinIO defaults to us-east-1
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER || 'admin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'golden123456',
  },
  forcePathStyle: true, // Required for MinIO
});

export const s3Service = {
  /**
   * Uploads a base64 encoded image to MinIO and returns the public URL.
   * If the input is already a valid HTTP URL, it returns it unmodified.
   */
  async uploadBase64Image(base64String: string, folder: string = 'products'): Promise<string> {
    try {
      // If it's already an external HTTP link or S3 link, do not re-upload
      if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
        return base64String;
      }

      // Regex to parse things like: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let contentType = 'image/jpeg';
      let extension = '.jpg';

      if (matches && matches.length === 3) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        if (contentType.includes('png')) extension = '.png';
        if (contentType.includes('webp')) extension = '.webp';
        if (contentType.includes('gif')) extension = '.gif';
      } else {
        // Fallback for raw base64 without data specifier
        buffer = Buffer.from(base64String, 'base64');
      }

      const fileName = `${folder}/${uuidv4()}${extension}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
        // ACL: 'public-read' is often used, but we configured mc anonymous download on bucket level.
      });

      await s3Client.send(command);

      // Return the publicly accessible URL
      // Adjust depending on how you expose S3 through Cloudflare (e.g. s3.asb.web.tr/golden-bucket/... or pure proxy)
      return `${PUBLIC_URL_BASE}/${fileName}`;

    } catch (error) {
      console.error('[S3 Service] Error uploading image:', error);
      throw new Error('Image upload failed');
    }
  }
};
