import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

console.log('🧹 Nettoyage des anciens fichiers S3...\n');

// Supprimer tous les icon-512.png (anciens fichiers)
const { Contents } = await s3Client.send(new ListObjectsV2Command({
  Bucket: 'onesms',
  Prefix: 'icons/',
}));

let deletedCount = 0;
const oldPattern = /icon-512\.png$/;

for (const obj of Contents || []) {
  if (oldPattern.test(obj.Key)) {
    console.log(`��️  Suppression: ${obj.Key}`);
    await s3Client.send(new DeleteObjectCommand({
      Bucket: 'onesms',
      Key: obj.Key,
    }));
    deletedCount++;
  }
}

console.log(`\n✅ ${deletedCount} anciens fichiers supprimés`);
