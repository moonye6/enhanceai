export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// fal.ai API configuration
const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;
const FAL_AI_ENDPOINT = 'https://fal.run/fal-ai/image-upscaling';

// Rate limiting constants
const FREE_TIER_LIMIT = 3;

export async function POST(request: NextRequest) {
  try {
    const isDemoMode = !FAL_AI_API_KEY;
    
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ 
        error: 'No image provided',
        code: 'NO_IMAGE',
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload JPG, PNG, or WebP.',
        code: 'INVALID_FILE_TYPE',
      }, { status: 400 });
    }

    // Check file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Image too large. Maximum size is 5MB.',
        code: 'FILE_TOO_LARGE',
      }, { status: 400 });
    }

    // Convert to base64 (Edge-compatible)
    const arrayBuffer = await image.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = '';
    uint8Array.forEach(byte => {
      base64 += String.fromCharCode(byte);
    });
    base64 = btoa(base64);
    const dataUrl = `data:${image.type};base64,${base64}`;

    // Demo mode - return original image
    if (isDemoMode) {
      return NextResponse.json({ 
        enhancedUrl: dataUrl,
        demo: true,
        message: 'Demo mode - add FAL_AI_API_KEY for real enhancement',
        remaining: FREE_TIER_LIMIT,
      });
    }

    // Call fal.ai API
    const response = await fetch(FAL_AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: dataUrl,
        scale: 2,
        model: 'realesrgan-x4plus',
      }),
    });

    if (!response.ok) {
      console.error('fal.ai error:', response.status);
      return NextResponse.json({ 
        error: 'Enhancement failed. Please try again.',
        code: 'ENHANCEMENT_FAILED',
      }, { status: 500 });
    }

    const result = await response.json();
    
    return NextResponse.json({ 
      enhancedUrl: result.image?.url || result.images?.[0]?.url,
      remaining: FREE_TIER_LIMIT - 1,
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    return NextResponse.json({ 
      error: 'Something went wrong. Please try again.',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasApiKey: !!FAL_AI_API_KEY,
    demoMode: !FAL_AI_API_KEY,
    version: '1.0.0',
  });
}
