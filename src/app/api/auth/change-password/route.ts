import { NextRequest, NextResponse } from 'next/server';
import { TokenService } from '@/server/auth/token.service';
import { AuthService } from '@/server/auth/auth.service';
import { changePasswordSchema } from '@/server/validators/auth.validator';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const payload = TokenService.verifyToken(accessToken);
    const body = await request.json();
    
    // Validar input
    const validatedData = changePasswordSchema.parse(body);
    
    // Mudar senha
    await AuthService.changePassword(
      payload.userId,
      payload.tenantId,
      validatedData.currentPassword,
      validatedData.newPassword
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Change password failed' },
      { status: 400 }
    );
  }
}
