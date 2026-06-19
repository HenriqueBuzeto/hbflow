import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/server/middleware/tenant.middleware';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { prisma } from '@/server/db/prisma';

export async function GET() {
  try {
    const tenantId = await requireTenant();
    await requirePermission('settings.read');

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        email: true,
        phone: true,
        document: true,
        createdAt: true
      }
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Empresa não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant });
  } catch (error: any) {
    console.error('Error fetching tenant details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = await requireTenant();
    await requirePermission('settings.edit');

    const body = await request.json().catch(() => ({}));
    const { name, email, phone, document } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'O nome da empresa é obrigatório.' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    const updateData: any = {
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      phone: phone ? phone.replace(/\D/g, '') : null
    };

    // Permitir preenchimento do CNPJ uma única vez se estiver vazio
    if (!tenant?.document && document && document.trim()) {
      const cleanDoc = document.replace(/\D/g, '');
      if (cleanDoc.length >= 11) {
        updateData.document = cleanDoc;
      }
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Dados da empresa atualizados com sucesso!',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        slug: updatedTenant.slug,
        plan: updatedTenant.plan,
        email: updatedTenant.email,
        phone: updatedTenant.phone,
        document: updatedTenant.document
      }
    });
  } catch (error: any) {
    console.error('Error updating tenant details:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
