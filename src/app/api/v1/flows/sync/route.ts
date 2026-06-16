import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { requireTenant } from '@/server/middleware/tenant.middleware';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();

    const body = await request.json();
    const { flows } = body;

    if (!flows || !Array.isArray(flows)) {
      return NextResponse.json({ error: 'Formato inválido. Parâmetro flows deve ser um array.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const flow of flows) {
        // 1. Remover nós e arestas antigos associados a este fluxo
        await tx.flowNode.deleteMany({
          where: { flowId: flow.id, tenantId }
        });

        await tx.flowEdge.deleteMany({
          where: { flowId: flow.id, tenantId }
        });

        // 2. Upsert do Fluxo principal
        await tx.flow.upsert({
          where: { id: flow.id },
          update: {
            name: flow.name,
            description: flow.description || '',
            triggerType: flow.triggerType || 'message_received',
            isActive: flow.isActive !== false
          },
          create: {
            id: flow.id,
            tenantId,
            name: flow.name,
            description: flow.description || '',
            triggerType: flow.triggerType || 'message_received',
            isActive: flow.isActive !== false
          }
        });

        // 3. Inserir os nós
        if (flow.nodes && flow.nodes.length > 0) {
          const nodesData = flow.nodes.map((node: any) => ({
            id: node.id,
            tenantId,
            flowId: flow.id,
            type: node.type,
            positionX: node.positionX || 0,
            positionY: node.positionY || 0,
            configJson: JSON.stringify(node.config || {})
          }));

          await tx.flowNode.createMany({
            data: nodesData
          });
        }

        // 4. Inserir as arestas (edges)
        if (flow.edges && flow.edges.length > 0) {
          const edgesData = flow.edges.map((edge: any) => ({
            id: edge.id,
            tenantId,
            flowId: flow.id,
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            conditionJson: JSON.stringify({
              conditionValue: edge.conditionValue || edge.condition || ''
            })
          }));

          await tx.flowEdge.createMany({
            data: edgesData
          });
        }

        // 5. Registrar log de auditoria
        await tx.auditLog.create({
          data: {
            tenantId,
            action: 'flow.synced',
            entity: 'flow',
            entityId: flow.id,
            metadata: {
              name: flow.name,
              nodesCount: flow.nodes?.length || 0,
              edgesCount: flow.edges?.length || 0
            }
          }
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Fluxos sincronizados com sucesso!' });
  } catch (error: any) {
    console.error('[FlowsSync] Sync error:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    if (error.message === 'USER_HAS_NO_TENANT') {
      return NextResponse.json({ error: 'Usuário sem inquilino associado.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
