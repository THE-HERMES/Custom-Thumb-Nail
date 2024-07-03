import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { kv } from '@vercel/kv';
import sharp from 'sharp';
import fetch from 'node-fetch';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

type Data = {
  iframeUrl: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: string }>
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { youtubeUrl, thumbnailUrl, title } = req.body;
      
      if (!youtubeUrl || !thumbnailUrl || !title) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const youtubeId = new URL(youtubeUrl).searchParams.get('v');
      
      if (!youtubeId) {
        res.status(400).json({ error: 'Invalid YouTube URL' });
        return;
      }
      
      const id = crypto.randomBytes(8).toString('hex');
      
      // Fetch and process thumbnail
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        res.status(400).json({ error: 'Failed to fetch custom thumbnail' });
        return;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await sharp(Buffer.from(arrayBuffer))
        .avif()
        .toBuffer();
      
      const avifFileName = `${id}.avif`;
      
      // Upload to S3
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: 'temizmama',
          Key: `thumbnails/${avifFileName}`,
          Body: buffer,
          ContentType: 'image/avif',
        },
      });

      await upload.done();
      
      const data = {
        id,
        youtubeId,
        customThumbnailUrl: `https://temizmama.s3.${process.env.AWS_REGION}.amazonaws.com/thumbnails/${avifFileName}`,
        title,
      };
      
      // Save to Vercel KV
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