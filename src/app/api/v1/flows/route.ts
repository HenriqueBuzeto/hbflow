import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/middleware/auth.middleware';
import { prisma } from '@/server/db/prisma';
import { FlowEngineService } from '@/server/services/whatsapp/flow-engine.service';

export async function GET(request: NextRequest) {
  try {
    const userSession = await requireAuth();
    const tenantId = userSession.tenantId;

    let flows = await prisma.flow.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        nodes: true,
        edges: true,
      },
    });

    const totalFlowsCount = await prisma.flow.count({
      where: { tenantId }
    });

    if (totalFlowsCount === 0) {
      // Bootstrap default welcome flow if none exists
      const newFlow = await FlowEngineService.bootstrapDefaultFlow(tenantId);
      if (newFlow) {
        flows = await prisma.flow.findMany({
          where: { tenantId, deletedAt: null },
          include: {
            nodes: true,
            edges: true,
          },
        });
      }
    }

    // Format fields for frontend consumption
    const formattedFlows = flows.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      isActive: f.isActive,
      nodes: f.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        config: JSON.parse(n.configJson),
        positionX: n.positionX,
        positionY: n.positionY,
      })),
      edges: f.edges.map((e) => {
        let conditionValue = undefined;
        try {
          const cond = JSON.parse(e.conditionJson);
          conditionValue = cond.conditionValue;
        } catch (err) {}
        return {
          id: e.id,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          conditionValue,
        };
      }),
    }));

    return NextResponse.json({ success: true, flows: formattedFlows });
  } catch (error: any) {
    console.error('[Flows API] Error fetching flows:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao carregar fluxos.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userSession = await requireAuth();
    const tenantId = userSession.tenantId;
    const body = await request.json();

    const { id: flowId, name, description, isActive, nodes, edges } = body;

    if (!flowId) {
      return NextResponse.json({ error: 'ID do fluxo é obrigatório.' }, { status: 400 });
    }

    // Verify ownership
    const existingFlow = await prisma.flow.findFirst({
      where: { id: flowId, tenantId },
    });

    if (!existingFlow) {
      return NextResponse.json({ error: 'Fluxo não encontrado.' }, { status: 404 });
    }

    // Transactionally update the flow, nodes, and edges
    await prisma.$transaction([
      prisma.flowNode.deleteMany({ where: { flowId } }),
      prisma.flowEdge.deleteMany({ where: { flowId } }),
      prisma.flow.update({
        where: { id: flowId },
        data: {
          name: name !== undefined ? name : existingFlow.name,
          description: description !== undefined ? description : existingFlow.description,
          isActive: isActive !== undefined ? isActive : existingFlow.isActive,
          nodes: {
            create: (nodes || []).map((n: any) => ({
              id: n.id,
              tenantId,
              type: n.type,
              configJson: JSON.stringify(n.config || {}),
              positionX: Math.round(n.positionX || 0),
              positionY: Math.round(n.positionY || 0),
            })),
          },
          edges: {
            create: (edges || []).map((e: any) => ({
              id: e.id,
              tenantId,
              sourceNodeId: e.sourceNodeId,
              targetNodeId: e.targetNodeId,
              conditionJson: JSON.stringify({ conditionValue: e.conditionValue }),
            })),
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Fluxo salvo com sucesso!' });
  } catch (error: any) {
    console.error('[Flows API] Error updating flow:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao salvar alterações do fluxo.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userSession = await requireAuth();
    const tenantId = userSession.tenantId;
    const body = await request.json();
    const { name, description } = body;

    const newFlow = await prisma.flow.create({
      data: {
        tenantId,
        name: name || 'Novo Fluxo de Triagem',
        description: description || 'Descreva as ações deste fluxo de triagem.',
        triggerType: 'message_received',
        isActive: false,
        nodes: {
          create: [
            {
              id: `node-${Date.now()}`,
              tenantId,
              type: 'message',
              positionX: 100,
              positionY: 100,
              configJson: JSON.stringify({
                messageText: 'Olá! Como podemos ajudar hoje?'
              })
            }
          ]
        }
      },
      include: {
        nodes: true,
        edges: true
      }
    });

    const formattedFlow = {
      id: newFlow.id,
      name: newFlow.name,
      description: newFlow.description,
      isActive: newFlow.isActive,
      nodes: newFlow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        config: JSON.parse(n.configJson),
        positionX: n.positionX,
        positionY: n.positionY,
      })),
      edges: []
    };

    return NextResponse.json({ success: true, flow: formattedFlow });
  } catch (error: any) {
    console.error('[Flows API] Error creating flow:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao criar fluxo.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userSession = await requireAuth();
    const tenantId = userSession.tenantId;
    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get('id');

    if (!flowId) {
      return NextResponse.json({ error: 'ID do fluxo é obrigatório.' }, { status: 400 });
    }

    // Verify ownership
    const existingFlow = await prisma.flow.findFirst({
      where: { id: flowId, tenantId, deletedAt: null },
    });

    if (!existingFlow) {
      return NextResponse.json({ error: 'Fluxo não encontrado.' }, { status: 404 });
    }

    await prisma.flow.update({
      where: { id: flowId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ success: true, message: 'Fluxo excluído com sucesso!' });
  } catch (error: any) {
    console.error('[Flows API] Error deleting flow:', error);
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro ao excluir fluxo.' }, { status: 500 });
  }
}
