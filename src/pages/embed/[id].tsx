import { GetServerSideProps } from 'next';
import React, { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import styles from '../../styles/Embed.module.css';
import { useRouter } from 'next/router';

interface EmbedProps {
  youtubeId: string;
  thumbnailBase64: string;
  title: string;
}

const Embed: React.FC<EmbedProps> = ({ youtubeId, thumbnailBase64, title }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (showVideo) {
      const timer = setTimeout(() => {
        const thumbnail = document.querySelector(`.${styles.thumbnail}`);
        if (thumbnail) thumbnail.classList.add(styles.hidden);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showVideo]);

  const handleThumbnailClick = () => {
    setLoading(true);
    setShowVideo(true);
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      new (window as any).YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: youtubeId,
        playerVars: {
          'autoplay': 1,
          'playsinline': 1
        },
        events: {
          'onReady': (event: any) => {
            event.target.playVideo();
            setLoading(false);
          }
        }
      });
    }
  };

  if (router.isFallback) {
    return <div>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.videoWrapper}>
        <div id="youtube-player"></div>
        {!showVideo && (
          <div className={styles.thumbnail} onClick={handleThumbnailClick}>
            <img src={`data:image/avif;base64,${thumbnailBase64}`} alt={title} />
            <div className={styles.playButton}></div>
          </div>
        )}
        {loading && (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const filePath = path.join(process.cwd(), 'data', `${id}.json`);
  
  if (fs.existsSync(filePath)) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContents);
    const youtubeId = new URL(data.youtubeUrl).searchParams.get('v');
    
    const thumbnailPath = path.join(process.cwd(), 'private', 'thumbnails', data.thumbnailUrl);
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const thumbnailBase64 = thumbnailBuffer.toString('base64');

    return {
      props: {
        youtubeId,
        thumbnailBase64,
        title: data.title,
      },
    };
  }
  
  return {
    notFound: true,
  };
};

export default Embed;