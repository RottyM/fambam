import { NextResponse } from 'next/server';

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const maxReadyTime = searchParams.get('maxReadyTime');

  if (!API_KEY) {
    return NextResponse.json({ error: 'Spoonacular API key is not configured.' }, { status: 500 });
  }

  if (!query) {
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

    const response = await fetch(`${BASE_URL}/recipes/complexSearch?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to search recipes');
    }

    return NextResponse.json(data.results || []);
  } catch (error) {
    console.error('Error searching recipes:', error);
    return NextResponse.json({ error: 'Failed to search recipes.' }, { status: 500 });
  }
}
