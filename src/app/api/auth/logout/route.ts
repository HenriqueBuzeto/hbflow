import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/server/auth/token.service';
import { AuthService } from '@/server/auth/auth.service';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }
    
    try {
      const payload = TokenService.verifyToken(accessToken);
      await AuthService.logout(payload.userId, payload.tenantId);
    } catch (error) {
      // Token inválido, mas ainda assim limpar cookies
    }
    
    // Limpar cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Mesmo com erro, limpar cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    
    return response;
  }
}
