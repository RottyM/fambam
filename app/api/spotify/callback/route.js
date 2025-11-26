import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  // If Spotify didn't send a code, send back to music page with error
  if (!code) return NextResponse.redirect(new URL('/music?error=no_code', request.url));

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  // IMPORTANT: This must match your Spotify Dashboard EXACTLY
  const redirectUri = 'http://127.0.0.1:3000/api/spotify/callback';

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
    // Save access + refresh tokens so we can auto-refresh without re-prompting
    const accessMaxAge = data.expires_in ? Math.max(data.expires_in - 60, 300) : 3600; // small buffer
    cookies().set('spotify_user_token', data.access_token, { 
        maxAge: accessMaxAge, 
        path: '/',
        httpOnly: true,
    });
    if (data.refresh_token) {
      // Spotify may not always return a refresh_token if the user already granted access
      cookies().set('spotify_refresh_token', data.refresh_token, { 
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
          httpOnly: true,
      });
    }
    // Send user back to Music page with success message
    return NextResponse.redirect(new URL('/music?status=connected', request.url));
  } else {
    console.error("Spotify Token Error:", data);
    return NextResponse.redirect(new URL('/music?error=token_failed', request.url));
  }
}
