import { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import React, { useState, useEffect } from 'react';
import { kv } from '@vercel/kv';
import styles from '../../styles/Embed.module.css';

interface EmbedData {
    youtubeId: string;
    customThumbnailUrl: string;
    title: string;
}

const Embed: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ youtubeId, customThumbnailUrl, title }) => {
    const [showVideo, setShowVideo] = useState(false);

    useEffect(() => {
        if (showVideo) {
            const timer = setTimeout(() => {
                const thumbnail = document.querySelector(`.${styles.thumbnail}`);
                thumbnail?.classList.add(styles.hidden);
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
                    <div className={styles.thumbnail} onClick={handleThumbnailClick} role="button" tabIndex={0}> 
                        <img src={customThumbnailUrl} alt={title} />
                        <div className={styles.playButton} />
                    </div>
                )}
                {showVideo && (
                    <iframe
                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1`} 
                        allow="autoplay; encrypted-media; picture-in-picture" 
                        allowFullScreen
                        title={title}
                    />
                )}
            </div>
        </div>
    );
};

export const getServerSideProps: GetServerSideProps<{ youtubeId: string, customThumbnailUrl: string, title: string }> = async (context) => {
    const { id } = context.params as { id: string };

    if (!id || typeof id !== 'string') {
        return { notFound: true };
    }

    try {
        const data = await kv.get<EmbedData>(`iframe:${id}`); 
        if (!data) {
            return { notFound: true };
        }

        return {
            props: data, 
        };
    } catch (error) {
        console.error('Error fetching data:', error);
        return { notFound: true };
    }
};

export default Embed;
