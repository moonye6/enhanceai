export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const FAL_AI_ENDPOINT = 'https://fal.run/fal-ai/image-upscaling';
const FREE_TIER_LIMIT = 3;

export async function POST(request: NextRequest) {
  try {
    const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;
    const isDemoMode = !FAL_AI_API_KEY;
    
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ 
        error: 'No image provided',
        code: 'NO_IMAGE',
      }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
      }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'Image too large',
        code: 'FILE_TOO_LARGE',
      }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    const dataUrl = `data:${image.type};base64,${base64}`;

    if (isDemoMode) {
      return NextResponse.json({ 
        enhancedUrl: dataUrl,
        demo: true,
        message: 'Demo mode',
        remaining: FREE_TIER_LIMIT,
      });
    }

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
      return NextResponse.json({ 
        error: 'Enhancement failed',
        code: 'ENHANCEMENT_FAILED',
      }, { status: 500 });
    }

    const result = await response.json();
    
    return NextResponse.json({ 
      enhancedUrl: result.image?.url || result.images?.[0]?.url,
      remaining: FREE_TIER_LIMIT - 1,
    });

  } catch (error) {
    return NextResponse.json({ 
      error: String(error),
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasApiKey: !!process.env.FAL_AI_API_KEY,
    demoMode: !process.env.FAL_AI_API_KEY,
    version: '1.0.0',
  });
}
