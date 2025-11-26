import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function cleanTitle(title) {
  const safeTitle = typeof title === 'string' ? title : '';
  return safeTitle
    .replace(/(\(|\[)(official|video|audio|lyrics|hq|hd|4k)(\)|\])/gi, '')
    .replace(/ft\.|feat\./gi, '')
    .trim();
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description || 'Failed to refresh Spotify token');
  }

  return data;
}

function setCookieQueue(response, queue) {
  queue.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
}

export async function POST(request) {
  const cookieStore = cookies();
  const accessTokenCookie = cookieStore.get('spotify_user_token');
  const refreshTokenCookie = cookieStore.get('spotify_refresh_token');

  let userToken = accessTokenCookie?.value;
  const refreshToken = refreshTokenCookie?.value;
  let refreshed = false;
  const cookieQueue = [];

  const ensureFreshAccessToken = async () => {
    if (!refreshToken) return false;
    try {
      const refreshedData = await refreshAccessToken(refreshToken);
      userToken = refreshedData.access_token;
      const accessMaxAge = refreshedData.expires_in ? Math.max(refreshedData.expires_in - 60, 300) : 3600;
      cookieQueue.push({
        name: 'spotify_user_token',
        value: userToken,
        options: { path: '/', httpOnly: true, maxAge: accessMaxAge },
      });
      if (refreshedData.refresh_token) {
        cookieQueue.push({
          name: 'spotify_refresh_token',
          value: refreshedData.refresh_token,
          options: { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 30 },
        });
      }
      refreshed = true;
      return true;
    } catch (e) {
      console.error('Spotify token refresh failed:', e);
      return false;
    }
  };

  if (!userToken) {
    const refreshedOk = await ensureFreshAccessToken();
    if (!refreshedOk || !userToken) {
      const response = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      setCookieQueue(response, cookieQueue);
      return response;
    }
  }

  try {
    const { jams = [], playlistName } = await request.json();
    const jamList = Array.isArray(jams) ? jams : [];

    const fetchWithAuth = async (url, init = {}) => {
      const res = await fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), Authorization: `Bearer ${userToken}` },
      });
      if (res.status === 401 && refreshToken && !refreshed) {
        const refreshedOk = await ensureFreshAccessToken();
        if (refreshedOk && userToken) {
          return fetch(url, {
            ...init,
            headers: { ...(init.headers || {}), Authorization: `Bearer ${userToken}` },
          });
        }
      }
      return res;
    };

    // Get User ID
    const userRes = await fetchWithAuth('https://api.spotify.com/v1/me');

    if (!userRes.ok) {
      const errorBody = await userRes.json().catch(() => ({}));
      const response = NextResponse.json(
        { error: errorBody?.error?.message || 'Could not load Spotify user' },
        { status: userRes.status }
      );
      setCookieQueue(response, cookieQueue);
      return response;
    }

    const userData = await userRes.json();
    const userId = userData?.id;
    if (!userId) {
      const response = NextResponse.json({ error: 'Missing Spotify user id' }, { status: 400 });
      setCookieQueue(response, cookieQueue);
      return response;
    }

    // Find Matches
    const promises = jamList.map(async (jam) => {
      if (!jam || typeof jam.link !== 'string') return null;

      if (jam.type === 'spotify') {
        const match = jam.link.match(/track\/([a-zA-Z0-9]+)/);
        return match ? `spotify:track:${match[1]}` : null;
      }

      if (jam.type === 'youtube') {
        const q = encodeURIComponent(`${cleanTitle(jam.title)} ${jam.artist || ''}`.trim());
        if (!q) return null;

        try {
          const searchRes = await fetchWithAuth(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`);
          if (!searchRes.ok) {
            console.error('Spotify search failed', searchRes.status);
            return null;
          }
          const searchData = await searchRes.json();
          if (searchData.tracks?.items?.length > 0) {
            return searchData.tracks.items[0].uri;
          }
        } catch (e) {
          console.error('Spotify search error', e);
          return null;
        }
      }

      return null;
    });

    const results = await Promise.all(promises);
    const validUris = results.filter((uri) => typeof uri === 'string' && uri.length > 0);

    if (validUris.length === 0) {
        const response = NextResponse.json({ error: 'No matching songs found on Spotify' }, { status: 400 });
        setCookieQueue(response, cookieQueue);
        return response;
    }

    // Create Playlist
    const createRes = await fetchWithAuth(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: playlistName || `Family Jams (${new Date().toLocaleDateString()})`,
        description: "Created by Family OS ??",
        public: false
      })
    });
    
    const playlistData = await createRes.json();
    if (!createRes.ok || !playlistData?.id) {
      const response = NextResponse.json(
        { error: playlistData?.error?.message || 'Failed to create playlist' },
        { status: createRes.status || 500 }
      );
      setCookieQueue(response, cookieQueue);
      return response;
    }

    const addTracksRes = await fetchWithAuth(`https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: validUris })
    });

    if (!addTracksRes.ok) {
      const addTracksBody = await addTracksRes.json().catch(() => ({}));
      const response = NextResponse.json(
        { error: addTracksBody?.error?.message || 'Failed to add tracks to playlist' },
        { status: addTracksRes.status || 500 }
      );
      setCookieQueue(response, cookieQueue);
      return response;
    }

    const response = NextResponse.json({ 
        success: true, 
        link: playlistData.external_urls?.spotify || null,
        uri: playlistData.uri || null,
        count: validUris.length 
    });
    setCookieQueue(response, cookieQueue);
    return response;

  } catch (error) {
    console.error('Playlist Creation Error:', error);
    const response = NextResponse.json({ error: 'Failed' }, { status: 500 });
    setCookieQueue(response, cookieQueue);
    return response;
  }
}
