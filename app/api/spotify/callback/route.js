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
    // Save the token to a cookie so we can use it later to create the playlist
    cookies().set('spotify_user_token', data.access_token, { 
        maxAge: 3600, 
        path: '/',
        httpOnly: true,
    });
    // Send user back to Music page with success message
    return NextResponse.redirect(new URL('/music?status=connected', request.url));
  } else {
    console.error("Spotify Token Error:", data);
    return NextResponse.redirect(new URL('/music?error=token_failed', request.url));
  }
}