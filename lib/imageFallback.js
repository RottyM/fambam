// Fetches a fallback food image from Unsplash using the provided query.
// If the request fails or no key is configured, falls back to the public source endpoint.
const UNSPLASH_URL = 'https://api.unsplash.com/photos/random';

export async function fetchFoodImageFallback(query) {
  const fallbackQuery = encodeURIComponent(query || 'recipe');
  const publicSourceUrl = `https://source.unsplash.com/1200x800/?food,${fallbackQuery}&t=${Date.now()}`;

  try {
    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    // If no key is provided, fall back to the public source endpoint (no auth required).
    if (!accessKey) {
      return publicSourceUrl;
    }

    const params = new URLSearchParams({
      query: `food,${query || 'recipe'}`,
      orientation: 'landscape',
      content_filter: 'high',
      client_id: accessKey,
    });

    const res = await fetch(`${UNSPLASH_URL}?${params.toString()}`);
    if (!res.ok) return publicSourceUrl;
    const data = await res.json();
    return data?.urls?.regular || data?.urls?.small || publicSourceUrl;
  } catch (error) {
    console.warn('Failed to fetch fallback image:', error);
    return publicSourceUrl;
  }
}
