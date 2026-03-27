import { NextRequest, NextResponse } from 'next/server';

// fal.ai API configuration
const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;
const FAL_AI_ENDPOINT = 'https://fal.run/fal-ai/image-upscaling';

// Rate limiting - IP based (Cloudflare provides real IP via headers)
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in ms
const FREE_TIER_LIMIT = 3;

// In-memory rate limit store (for serverless, consider using KV in production)
// For Cloudflare Pages, use KV binding: env.RATE_LIMIT_KV
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIP(request: NextRequest): string {
  // Cloudflare provides real IP via these headers
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  // Fallback for local development
  return '127.0.0.1';
}

function checkIPRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetAt) {
    // New window
    const resetAt = now + RATE_LIMIT_WINDOW;
    return { allowed: true, remaining: FREE_TIER_LIMIT, resetAt };
  }
  
  const remaining = Math.max(0, FREE_TIER_LIMIT - record.count);
  return {
    allowed: record.count < FREE_TIER_LIMIT,
    remaining,
    resetAt: record.resetAt,
  };
}

function incrementIPRateLimit(ip: string): { remaining: number; resetAt: number } {
  const now = Date.now();
  let record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  }
  
  record.count += 1;
  rateLimitStore.set(ip, record);
  
  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  return {
    remaining: Math.max(0, FREE_TIER_LIMIT - record.count),
    resetAt: record.resetAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check API key first
    const isDemoMode = !FAL_AI_API_KEY;
    
    // Rate limiting (skip in demo mode)
    if (!isDemoMode) {
      const clientIP = getClientIP(request);
      const rateLimit = checkIPRateLimit(clientIP);
      
      if (!rateLimit.allowed) {
        return NextResponse.json({ 
          error: 'Daily limit reached',
          code: 'RATE_LIMIT_EXCEEDED',
          remaining: 0,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
          upgradeUrl: '/#pricing',
        }, { status: 429 });
      }
    }
    
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
        maxSize: 5 * 1024 * 1024,
        actualSize: image.size,
      }, { status: 400 });
    }

    // Demo mode - return original image with message
    if (isDemoMode) {
      console.log('[EnhanceAI] Running in demo mode - no FAL_AI_API_KEY configured');
      
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${image.type};base64,${base64}`;
      
      return NextResponse.json({ 
        enhancedUrl: dataUrl,
        demo: true,
        message: 'Demo mode - add FAL_AI_API_KEY environment variable for real enhancement',
        remaining: FREE_TIER_LIMIT,
      });
    }

    // Convert to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${image.type};base64,${base64}`;

    // Call fal.ai API
    console.log('[EnhanceAI] Calling fal.ai API...');
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
      const errorText = await response.text();
      console.error('[EnhanceAI] fal.ai API error:', response.status, errorText);
      
      // Parse error for user-friendly message
      let errorMessage = 'Enhancement failed. Please try again.';
      let errorCode = 'ENHANCEMENT_FAILED';
      
      if (response.status === 401) {
        errorMessage = 'API authentication failed. Please contact support.';
        errorCode = 'API_AUTH_ERROR';
      } else if (response.status === 429) {
        errorMessage = 'Service busy. Please try again in a moment.';
        errorCode = 'SERVICE_BUSY';
      } else if (response.status >= 500) {
        errorMessage = 'Service temporarily unavailable. Please try again.';
        errorCode = 'SERVICE_ERROR';
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: errorCode,
      }, { status: response.status >= 500 ? 503 : response.status });
    }

    const result = await response.json();
    
    // Increment rate limit after successful call
    const clientIP = getClientIP(request);
    const { remaining, resetAt } = incrementIPRateLimit(clientIP);
    
    console.log('[EnhanceAI] Enhancement successful');
    
    return NextResponse.json({ 
      enhancedUrl: result.image?.url || result.images?.[0]?.url,
      remaining,
      resetAt: new Date(resetAt).toISOString(),
    });

  } catch (error) {
    console.error('[EnhanceAI] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Something went wrong. Please try again.',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    hasApiKey: !!FAL_AI_API_KEY,
    demoMode: !FAL_AI_API_KEY,
    version: '1.0.0',
  });
}
