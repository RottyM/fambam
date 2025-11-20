import { NextResponse } from 'next/server';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function POST(req) {
  try {
    const { base64Image, mimeType } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }
    
    const prompt = `
      You are a recipe digitizer. Extract the recipe from this image into valid JSON.
      Detect if the source is "printed", "handwritten", or "mixed" (printed with notes).
      If there are handwritten annotations, put them in the "notes" field.
      
      Return JSON structure:
      {
        "name": "Recipe Name",
        "ingredients": [{"name": "", "amount": "", "category": ""}],
        "instructions": "...",
        "servings": "",
        "prepTime": "",
        "cookTime": "",
        "notes": "",
        "sourceType": "printed" | "handwritten" | "mixed",
        "confidence": "high" | "medium" | "low"
      }
    `;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) throw new Error('Gemini API Error');
    
    const data = await response.json();
    const recipeText = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ recipe: JSON.parse(recipeText) });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}