import { NextResponse } from 'next/server';

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

export async function GET(request, { params }) {
  const { id } = params;

  if (!API_KEY) {
    return NextResponse.json({ error: 'Spoonacular API key is not configured.' }, { status: 500 });
  }

  if (!id) {
    return NextResponse.json({ error: 'Recipe ID is required.' }, { status: 400 });
  }

  try {
    const apiParams = new URLSearchParams({
      apiKey: API_KEY,
      includeNutrition: true,
    });

    const response = await fetch(`${BASE_URL}/recipes/${id}/information?${apiParams}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get recipe information');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting recipe information:', error);
    return NextResponse.json({ error: 'Failed to get recipe information.' }, { status: 500 });
  }
}
