import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; 
import { kv } from '@vercel/kv';
import sharp from 'sharp';
import fetch from 'node-fetch';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,  
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

interface Data {
    iframeUrl: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data | { error: string }>
) {
    // CORS headers (consolidated)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end(); // No content for OPTIONS
        return;
    }

    if (req.method === 'POST') {
        try {
            const { youtubeUrl, thumbnailUrl, title } = req.body;

            if (!youtubeUrl || !thumbnailUrl || !title) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const youtubeId = new URL(youtubeUrl).searchParams.get('v');
            if (!youtubeId) {
                return res.status(400).json({ error: 'Invalid YouTube URL' });
            }

            const id = crypto.randomUUID(); // More secure UUID generation

            // Thumbnail fetching and processing (optimized)
            const response = await fetch(thumbnailUrl);
            if (!response.ok) {
                return res.status(response.status).json({ error: 'Failed to fetch thumbnail' }); 
            }

            const avifBuffer = await sharp(await response.arrayBuffer())
                .toFormat('avif')
                .toBuffer();
            const avifFileName = `${id}.avif`;

            // S3 upload (simplified with PutObjectCommand)
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,  // Use environment variable
                Key: `thumbnails/${avifFileName}`,
                Body: avifBuffer,
                ContentType: 'image/avif',
            }));

            // Construct data object
            const data = {
                id,
                youtubeId,
                customThumbnailUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/thumbnails/${avifFileName}`,
                title,
            };

            // Save to Vercel KV
            await kv.set(`iframe:${id}`, JSON.stringify(data));

            const iframeUrl = `/embed/${id}`;
            res.status(200).json({ iframeUrl });

        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(); // No need to send JSON for disallowed methods
    }
}
