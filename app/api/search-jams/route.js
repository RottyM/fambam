import { NextResponse } from 'next/server';

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

export async function POST(request) {
  try {
    const { query, type } = await request.json();
    if (!query) return NextResponse.json({ results: [] });

    let results = [];

    if (type === 'spotify') {
      const token = await getSpotifyToken();
      const searchParams = new URLSearchParams({ q: query, type: 'track', limit: '5' });
      const response = await fetch(`https://api.spotify.com/v1/search?${searchParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.tracks?.items) {
        results = data.tracks.items.map((track) => ({
          id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          link: track.external_urls.spotify,
          thumbnail: track.album.images[0]?.url, 
          releaseDate: track.album.release_date, // <--- CRITICAL FOR DATES
          source: 'spotify',
        }));
      }
    } else if (type === 'youtube') {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const searchParams = new URLSearchParams({ part: 'snippet', q: query, key: apiKey, type: 'video', maxResults: '5' });
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
      const data = await response.json();

      if (data.items) {
        results = data.items.map((item) => {
          const snippet = item.snippet;
          const bestThumb = snippet.thumbnails?.maxres?.url || snippet.thumbnails?.standard?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url;
          return {
            id: item.id.videoId,
            title: snippet.title,
            artist: snippet.channelTitle,
            link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            thumbnail: bestThumb,
            releaseDate: snippet.publishedAt, // <--- CRITICAL FOR DATES
            source: 'youtube',
          };
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}