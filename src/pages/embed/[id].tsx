import { GetServerSideProps } from 'next';
import React, { useState, useEffect } from 'react';
import { kv } from '@vercel/kv';
import styles from '../../styles/Embed.module.css';

interface EmbedProps {
  youtubeId: string;
  customThumbnailUrl: string;
  title: string;
}

const Embed: React.FC<EmbedProps> = ({ youtubeId, customThumbnailUrl, title }) => {
  const [showVideo, setShowVideo] = useState(false);

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
    setShowVideo(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.videoWrapper}>
        {!showVideo && (
          <div className={styles.thumbnail} onClick={handleThumbnailClick}>
            <img src={customThumbnailUrl} alt={title} />
            <div className={styles.playButton}></div>
          </div>
        )}
        {showVideo && (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={title}
          />
        )}
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params;
  const data = await kv.get(`iframe:${id}`);

  if (!data) {
    return {
      notFound: true,
    };
  }

  const { youtubeId, customThumbnailUrl, title } = JSON.parse(data as string);

  return {
    props: {
      youtubeId,
      customThumbnailUrl,
      title,
    },
  };
};

export default Embed;