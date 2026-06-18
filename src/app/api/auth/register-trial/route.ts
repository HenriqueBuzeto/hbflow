import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/server/auth/auth.service';
import { registerTrialSchema } from '@/server/validators/auth.validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar input
    const validatedData = registerTrialSchema.parse(body);
    
    // Fazer registro de trial
    const result = await AuthService.registerTrial(validatedData);
    
    // Retornar os dados gerados
    return NextResponse.json({
      tenantId: result.tenantId,
      userId: result.userId,
      companyName: result.companyName,
      userName: result.userName,
      loginEmail: result.loginEmail,
      password: result.password,
      trialEndsAt: result.trialEndsAt.toISOString(),
      totalAmountCents: result.totalAmountCents,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Register trial error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    // Retornar a mensagem exata de erro para validações customizadas
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
