import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { AuthService } from '@/server/auth/auth.service';
import { prisma } from '@/server/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const userSession = await requireAuth();

    // Check if the current tenant is on Pro or Enterprise plan
    const activeTenant = await prisma.tenant.findUnique({
      where: { id: userSession.tenantId }
    });

    if (!activeTenant) {
      return NextResponse.json({ error: 'Empresa ativa não encontrada.' }, { status: 404 });
    }

    const plan = activeTenant.plan.toLowerCase();
    if (plan !== 'pro' && plan !== 'enterprise') {
      return NextResponse.json({
        error: 'A criação e vinculação de múltiplas empresas (Multi-tenancy) está disponível apenas nos planos Pro e Enterprise. Faça o upgrade de seu plano no Painel Financeiro para liberar este recurso.'
      }, { status: 403 });
    }

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
