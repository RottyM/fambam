import { NextResponse } from 'next/server';

// 1. Helper: Get Spotify Token (Same as search-jams)
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

// 2. Helper: Clean YouTube Titles
// Removes junk like "(Official Video)", "[Lyrics]", etc. to improve search
function cleanTitle(title) {
  return title
    .replace(/(\(|\[)(official|video|audio|lyrics|hq|hd|4k)(\)|\])/gi, '') // Remove (Official Video)
    .replace(/ft\.|feat\./gi, '') // Remove ft. (Spotify handles this separately)
    .trim();
}

export async function POST(request) {
  try {
    const { jams } = await request.json();
    if (!jams || jams.length === 0) return NextResponse.json({ uris: [] });

    const token = await getSpotifyToken();
    let matchCount = 0;

    // Process all jams in parallel
    const promises = jams.map(async (jam) => {
      
      // A) Already a Spotify Song? Easy.
      if (jam.type === 'spotify') {
        // Extract ID from link
        const match = jam.link.match(/track\/([a-zA-Z0-9]+)/);
        if (match) {
            return `spotify:track:${match[1]}`;
        }
      }

      // B) YouTube Song? Search for it.
      if (jam.type === 'youtube') {
        const cleanName = cleanTitle(jam.title);
        // Search query: "Title Artist"
        const q = encodeURIComponent(`${cleanName} ${jam.artist}`);
        
        try {
          const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          
          if (data.tracks?.items?.length > 0) {
            matchCount++;
            return data.tracks.items[0].uri; // Returns "spotify:track:..."
          }
        } catch (e) {
          console.error("Match failed for", jam.title, e);
        }
      }
      return null;
    });

    const results = await Promise.all(promises);
    
    // Filter out failed matches
    const validUris = results.filter(uri => uri !== null);

    return NextResponse.json({ 
        uris: validUris,
        total: validUris.length,
        matches: matchCount 
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
