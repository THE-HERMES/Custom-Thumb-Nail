import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { kv } from '@vercel/kv';

// Environment variable kontrolü
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials are not properly set in environment variables");
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

type Data = {
  iframeUrl: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { youtubeUrl, thumbnailUrl, title } = req.body;
      
      const youtubeId = new URL(youtubeUrl).searchParams.get('v');
      
      if (!youtubeId) {
        res.status(400).json({ error: 'Invalid YouTube URL' });
        return;
      }
      
      const id = crypto.randomBytes(8).toString('hex');
      
      // Thumbnail işlemleri ve S3'e yükleme...
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        res.status(400).json({ error: 'Failed to fetch custom thumbnail' });
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      
      const buffer = await sharp(Buffer.from(arrayBuffer))
        .avif()
        .toBuffer();
      
      const avifFileName = `${uuidv4()}.avif`;
      
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `custom-thumbnails/${avifFileName}`,
          Body: buffer,
          ContentType: 'image/avif',
        },
      });

      await upload.done();

      const data = {
        id,
        youtubeId,
        customThumbnailUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/custom-thumbnails/${avifFileName}`,
        title,
      };
      
      // Veriyi Vercel KV'ye kaydet
      await kv.set(`iframe:${id}`, JSON.stringify(data));
      
      const iframeUrl = `/embed/${id}`;
      res.status(200).json({ iframeUrl });
    } catch (error) {
      console.error('Error in create-iframe:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}