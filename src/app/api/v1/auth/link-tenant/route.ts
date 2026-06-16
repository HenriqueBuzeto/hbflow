import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { AuthService } from '@/server/auth/auth.service';

export async function POST(request: NextRequest) {
  try {
    const userSession = await requireAuth();
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nome e slug são campos obrigatórios.' }, { status: 400 });
    }

    // Limpar slug
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug) {
      return NextResponse.json({ error: 'Subdomínio/Slug inválido.' }, { status: 400 });
    }

    const result = await AuthService.linkNewTenant(userSession.email, name, cleanSlug);

    return NextResponse.json({
      success: true,
      message: 'Nova empresa criada e vinculada com sucesso!',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        plan: result.tenant.plan,
      }
    });
  } catch (error: any) {
    console.error('[LinkTenant] Error linking new tenant:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || 'Falha ao criar e vincular empresa.' }, { status: 400 });
  }
}
