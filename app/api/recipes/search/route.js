import { NextResponse } from 'next/server';

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

export async function GET(request) {
  console.info("Spoonacular search request received.");

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const maxReadyTime = searchParams.get('maxReadyTime');

  if (!API_KEY) {
    console.error("Spoonacular API key is not configured. Check environment variables.");
    return NextResponse.json({ error: 'Spoonacular API key is not configured.' }, { status: 500 });
  } else {
    console.info("Spoonacular API key is present.");
  }

  if (!query) {
    console.warn("Search query is missing.");
    return NextResponse.json({ error: 'Query parameter is required.' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      apiKey: API_KEY,
      query: query,
      number: 30,
      instructionsRequired: true,
      addRecipeInformation: true,
      addRecipeNutrition: true,
    });

    if (maxReadyTime) {
      params.append('maxReadyTime', maxReadyTime);
    }

    const requestUrl = `${BASE_URL}/recipes/complexSearch?${params}`;
    console.info(`Making request to Spoonacular: ${requestUrl}`);

    const response = await fetch(requestUrl);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Spoonacular API error: ${response.status} ${response.statusText}`, { body: errorBody });
      throw new Error(`Spoonacular API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.info("Successfully fetched data from Spoonacular.");

    return NextResponse.json(data.results || []);
  } catch (error) {
    console.error('Error in Spoonacular search route:', { errorMessage: error.message, errorStack: error.stack });
    return NextResponse.json({ error: 'Failed to search recipes.' }, { status: 500 });
  }
}
