import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getBaseUrl(request) {
  const envUrl = process.env.SPOTIFY_REDIRECT_BASE || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = request.headers.get('host');
  if (!host) return '';
  if (host.startsWith('localhost')) {
    const port = host.split(':')[1] ? `:${host.split(':')[1]}` : '';
    return `http://127.0.0.1${port}`;
  }
  const proto = host.startsWith('127.') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) return NextResponse.redirect(new URL('/music?error=no_code', request.url));

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/music?error=missing_spotify_env', request.url));
  }
  
  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/spotify/callback`;

  // Exchange the "Code" for an "Access Token"
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (Buffer.from(clientId + ':' + clientSecret).toString('base64'))
    },
    body: new URLSearchParams({
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const data = await response.json();

  if (data.access_token) {
    const accessMaxAge = data.expires_in ? Math.max(data.expires_in - 60, 300) : 3600;
    cookies().set('spotify_user_token', data.access_token, { 
        maxAge: accessMaxAge, 
        path: '/',
        httpOnly: true,
    });
    if (data.refresh_token) {
      cookies().set('spotify_refresh_token', data.refresh_token, { 
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
          httpOnly: true,
      });
    }
    return NextResponse.redirect(new URL('/music?status=connected', request.url));
  } else {
    console.error("Spotify Token Error:", data);
    return NextResponse.redirect(new URL('/music?error=token_failed', request.url));
  }
}
