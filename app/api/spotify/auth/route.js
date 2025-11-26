import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  //const redirectUri = 'http://localhost:3000/api/spotify/callback';
  const redirectUri = 'http://127.0.0.1:3000/api/spotify/callback';

  // These scopes allow us to Create Playlists (Public & Private)
  const scope = 'playlist-modify-public playlist-modify-private';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scope,
    redirect_uri: redirectUri,
  });

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
