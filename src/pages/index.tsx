import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

const Home: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [title, setTitle] = useState('');
    const [iframeUrl, setIframeUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); 

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null); // Clear previous errors

        try {
            const response = await fetch('/api/create-iframe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ youtubeUrl, thumbnailUrl, title }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`); 
            }

            const data = await response.json();
            setIframeUrl(data.iframeUrl);
        } catch (error) {
            console.error('Error creating iframe:', error);
            setError((error as Error).message || 'An unknown error occurred.'); 
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className={styles.container}>
      <Head>
        <title>YouTube Custom Thumbnail</title>
        <meta name="description" content="Create custom thumbnails for YouTube videos" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
      <h1 className={styles.title}>YouTube Custom Thumbnail</h1>
        {error && <div className={styles.error}>{error}</div>} 

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="YouTube Video URL"
            required
          />
          <input
            type="text"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="Custom Thumbnail URL"
            required
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video Title"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Custom Iframe'}
          </button>
        </form>

        {iframeUrl && (
          <div className={styles.iframeContainer}>
            <h2>Generated Iframe:</h2>
            <iframe 
              src={iframeUrl} 
              style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0}}
              className="webembed-iframe"
              allowFullScreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              scrolling="no"
              title={title}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;