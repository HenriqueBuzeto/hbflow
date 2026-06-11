import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/auth/auth.service';
import { refreshTokenSchema } from '@/server/validators/auth.validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar input
    const validatedData = refreshTokenSchema.parse(body);
    
    // Refresh token
    const result = await AuthService.refreshToken(validatedData.refreshToken);
    
    // Retornar resposta com novos tokens em cookies httpOnly
    const response = NextResponse.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        avatarUrl: result.user.avatarUrl,
        roleId: result.user.roleId,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan,
      },
    });
    
    // Set cookies
    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Refresh token error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Refresh token failed' },
      { status: 401 }
    );
  }
}
