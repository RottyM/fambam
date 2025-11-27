import { NextResponse } from 'next/server';

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

export async function GET(request, { params }) {
  console.info("Spoonacular information request received.");

  const { id } = params;

  if (!API_KEY) {
    console.error("Spoonacular API key is not configured. Check environment variables.");
    return NextResponse.json({ error: 'Spoonacular API key is not configured.' }, { status: 500 });
  } else {
    console.info("Spoonacular API key is present.");
  }

  if (!id) {
    console.warn("Recipe ID is missing.");
    return NextResponse.json({ error: 'Recipe ID is required.' }, { status: 400 });
  }

  try {
    const apiParams = new URLSearchParams({
      apiKey: API_KEY,
      includeNutrition: true,
    });

    const requestUrl = `${BASE_URL}/recipes/${id}/information?${apiParams}`;
    console.info(`Making request to Spoonacular: ${requestUrl}`);

    const response = await fetch(requestUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Spoonacular API error: ${response.status} ${response.statusText}`, { body: errorBody });
      throw new Error(`Spoonacular API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.info("Successfully fetched data from Spoonacular.");

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in Spoonacular information route:', { errorMessage: error.message, errorStack: error.stack });
    return NextResponse.json({ error: 'Failed to get recipe information.' }, { status: 500 });
  }
}
