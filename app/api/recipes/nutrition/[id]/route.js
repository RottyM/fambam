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
    });

    const response = await fetch(`${BASE_URL}/recipes/${id}/nutritionWidget.json?${apiParams}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get nutrition info');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting nutrition:', error);
    return NextResponse.json({ error: 'Failed to get nutrition info.' }, { status: 500 });
  }
}
