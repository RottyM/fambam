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
          { text: "Analyze this recipe image and extract ALL information into a structured JSON format..." }, // Add your full prompt here
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
        response_mime_type: "application/json" // Gemini 1.5 supports JSON mode natively
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