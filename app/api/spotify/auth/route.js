import { NextResponse } from 'next/server';

function getBaseUrl(request) {
  // Allow explicit override; set to e.g. http://127.0.0.1:3000 for local testing.
  const envUrl = process.env.SPOTIFY_REDIRECT_BASE || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = request.headers.get('host');
  if (!host) return '';
  // If running on localhost, prefer 127.0.0.1 for services that reject "localhost".
  if (host.startsWith('localhost')) {
    const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
    return `http://127.0.0.1${port}`;
  }
  const proto = host.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function GET(request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing SPOTIFY_CLIENT_ID' }, { status: 500 });
  }

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/spotify/callback`;

  // Scopes needed to create playlists
  const scope = 'playlist-modify-public playlist-modify-private';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
