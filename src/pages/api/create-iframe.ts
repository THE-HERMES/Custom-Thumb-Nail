import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

type Data = {
  iframeUrl: string;
}

const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['https://blogmedia.temizmama.com'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: string }>
) {
  // CORS headers
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
      console.log('Received POST request:', req.body);

      const { youtubeUrl, thumbnailUrl, title } = req.body;

      if (!youtubeUrl || !thumbnailUrl || !title) {
        console.log('Missing required fields:', { youtubeUrl, thumbnailUrl, title });
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      
      const youtubeId = new URL(youtubeUrl).searchParams.get('v');
      
      if (!youtubeId) {
        console.log('Invalid YouTube URL:', youtubeUrl);
        res.status(400).json({ error: 'Invalid YouTube URL' });
        return;
      }
      
      const id = crypto.randomBytes(8).toString('hex');
      
      // Thumbnail işleme (gerçek uygulamada bu kısmı ayrı bir servise taşıyabilirsiniz)
      console.log('Fetching thumbnail:', thumbnailUrl);
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        console.log('Failed to fetch thumbnail:', response.status, response.statusText);
        res.status(400).json({ error: 'Failed to fetch thumbnail' });
        return;
      }
      const thumbnailBuffer = await response.arrayBuffer();
      
      const avifFileName = `${uuidv4()}.avif`;
      
      // Veriyi geçici olarak saklayın (gerçek uygulamada bir veritabanı kullanın)
      tempStorage[id] = {
        id,
        youtubeUrl,
        thumbnailUrl: avifFileName,
        title,
        thumbnailBuffer,
      };
      
      const iframeUrl = `${process.env.NEXT_PUBLIC_API_URL}/embed/${id}`;
      
      console.log('Successfully created iframe:', { id, iframeUrl });
      res.status(200).json({ iframeUrl });
    } catch (error) {
      console.error('Error in create-iframe:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  } else {
    console.log('Method not allowed:', req.method);
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}