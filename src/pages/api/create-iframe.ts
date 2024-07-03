import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

type Data = {
  iframeUrl: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'POST') {
    const { youtubeUrl, thumbnailUrl, title } = req.body;
    
    const youtubeId = new URL(youtubeUrl).searchParams.get('v');
    
    if (!youtubeId) {
      res.status(400).json({ error: 'Invalid YouTube URL' } as any);
      return;
    }
    
    const id = crypto.randomBytes(8).toString('hex');
    
    const response = await fetch(thumbnailUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const avifFileName = `${uuidv4()}.avif`;
    const avifPath = path.join(process.cwd(), 'private', 'thumbnails', avifFileName);
    
    const dir = path.dirname(avifPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await sharp(buffer)
      .avif()
      .toFile(avifPath);
    
    const iframeUrl = `/embed/${id}`;
    
    const data = {
      id,
      youtubeUrl,
      thumbnailUrl: avifFileName,
      title,
    };
    
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    fs.writeFileSync(path.join(dataDir, `${id}.json`), JSON.stringify(data));
    
    res.status(200).json({ iframeUrl });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}