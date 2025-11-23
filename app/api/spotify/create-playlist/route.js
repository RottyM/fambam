import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function cleanTitle(title) {
  return title
    .replace(/(\(|\[)(official|video|audio|lyrics|hq|hd|4k)(\)|\])/gi, '')
    .replace(/ft\.|feat\./gi, '')
    .trim();
}

export async function POST(request) {
  const tokenStore = cookies().get('spotify_user_token');
  const userToken = tokenStore?.value;

  if (!userToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { jams, playlistName } = await request.json();
    
    // Get User ID
    const userRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const userData = await userRes.json();
    const userId = userData.id;

    // Find Matches
    const promises = jams.map(async (jam) => {
      if (jam.type === 'spotify') {
        const match = jam.link.match(/track\/([a-zA-Z0-9]+)/);
        return match ? `spotify:track:${match[1]}` : null;
      }
      if (jam.type === 'youtube') {
        const q = encodeURIComponent(`${cleanTitle(jam.title)} ${jam.artist}`);
        try {
          const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          const searchData = await searchRes.json();
          if (searchData.tracks?.items?.length > 0) {
            return searchData.tracks.items[0].uri;
          }
        } catch (e) { return null; }
      }
      return null;
    });

    const results = await Promise.all(promises);
    const validUris = results.filter(uri => uri !== null);

    if (validUris.length === 0) {
        return NextResponse.json({ error: 'No matching songs found on Spotify' }, { status: 400 });
    }

    // Create Playlist
    const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistName || `Family Jams (${new Date().toLocaleDateString()})`,
        description: "Created by Family OS 🎸",
        public: false
      })
    });
    
    const playlistData = await createRes.json();

    // Add Songs
    await fetch(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: validUris })
    });

    return NextResponse.json({ 
        success: true, 
        link: playlistData.external_urls.spotify,
        count: validUris.length 
    });

  } catch (error) {
    console.error('Playlist Creation Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}