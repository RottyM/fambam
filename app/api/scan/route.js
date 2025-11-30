// app/api/scan/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageBase64, mimeType } = await request.json();
    
    // Use the server-side key (no NEXT_PUBLIC prefix needed here)
    const apiKey = process.env.GEMINI_API_KEY; 
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

const payload = {
      contents: [{
        parts: [
          // --- UPDATED PROMPT ---
          { text: `
            Analyze this recipe image. Extract the recipe title and ingredients.
            
            Return ONLY raw JSON (no markdown, no backticks) using exactly this schema:
            {
              "title": "Recipe Name",
              "ingredients": [
                { 
                  "name": "ingredient name (singular, lowercase)", 
                  "quantity": "amount (e.g. 1 cup)", 
                  "category": "produce|dairy|meat|pantry|baking|spices|frozen|other"
                }
              ]
            }
            
            Map every ingredient to the most logical category from the list above.
          `},
          // ----------------------
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}