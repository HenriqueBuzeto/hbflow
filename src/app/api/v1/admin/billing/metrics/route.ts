import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { requirePermission } from '@/server/middleware/permission.middleware';
import { requireActiveSubscription } from '@/server/middleware/subscription.middleware';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate and require admin privileges
    await requirePermission('billing.manage');
    await requireActiveSubscription();

    // 2. Calculate Total Revenue from paid invoices
    const paidInvoicesSum = await prisma.invoice.aggregate({
      _sum: { totalCents: true },
      where: { status: 'paid' }
    });
    const totalRevenue = (paidInvoicesSum._sum.totalCents || 0) / 100;


    // 3. Retrieve all active and blocked tenants to compute MRR and plan distribution
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      include: {
        subscriptions: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        tenantDiscounts: {
          where: {
            isActive: true,
            deletedAt: null,
            OR: [
              { endsAt: null },
              { endsAt: { gte: new Date() } }
            ]
          }
        }
      }
    });

    const totalTenantsCount = tenants.length;
    const blockedTenants = tenants.filter(t => t.isBlocked);
    const blockedCount = blockedTenants.length;

    let mrr = 0;
    let starterCount = 0;
    let proCount = 0;
    let enterpriseCount = 0;
    let trialCount = 0;

    tenants.forEach(t => {
      const activeSub = t.subscriptions[0];
      const hasFreeSub = activeSub?.status === 'free';
      
      // Verifica se possui desconto de 100% ou acesso gratuito
      const hasFreeDiscount = t.tenantDiscounts.some(d => d.type === 'free_access' || (d.type === 'percentage' && d.value === 100));
      const isExempt = hasFreeSub || hasFreeDiscount;

      // Calculate MRR based on active, non-blocked paid plans
      if (!t.isBlocked && t.status === 'active') {
        let tenantPrice = 0;
        if (t.plan === 'starter') {
          tenantPrice = 99.90;
          starterCount++;
        } else if (t.plan === 'pro') {
          tenantPrice = 189.90;
          proCount++;
        } else if (t.plan === 'enterprise') {
          tenantPrice = 499.90;
          enterpriseCount++;
        } else if (t.plan === 'trial') {
          trialCount++;
        } else {
          tenantPrice = 99.90; // default fallback
          starterCount++;
        }

        if (!isExempt) {
          let discountPercentage = 0;
          let fixedDiscount = 0;
          
          t.tenantDiscounts.forEach(d => {
            if (d.type === 'percentage') {
              discountPercentage += d.value;
            } else if (d.type === 'fixed_amount') {
              fixedDiscount += d.value;
            }
          });

          let finalTenantPrice = tenantPrice;
          if (discountPercentage > 0) {
            finalTenantPrice = finalTenantPrice * (1 - Math.min(100, discountPercentage) / 100);
          }
          finalTenantPrice = Math.max(0, finalTenantPrice - fixedDiscount);
          
          mrr += finalTenantPrice;
        }
      } else if (t.plan === 'trial') {
        trialCount++;
      }
    });

    // 4. Calculate active trials and expired trials
    const activeTrials = tenants.filter(t => !t.isBlocked && (t.plan === 'trial' || t.subscriptionStatus === 'trial')).length;
    const expiredTrials = tenants.filter(t => t.isBlocked && (t.plan === 'trial' || t.subscriptionStatus === 'trial')).length;

    // 5. Calculate Churn Rate percentage
    const churnRate = totalTenantsCount > 0 ? Math.round((blockedCount / totalTenantsCount) * 100) : 0;

    // 6. Generate historical chart data for the past 6 months
    const chartData = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = months[d.getMonth()];
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      // Count created tenants up to the end of that specific month
      const countAtMonth = tenants.filter(t => new Date(t.createdAt) <= endOfMonth).length;
      const blockedAtMonth = tenants.filter(t => new Date(t.createdAt) <= endOfMonth && t.isBlocked).length;
      const activeCount = Math.max(0, countAtMonth - blockedAtMonth);

      // Estimate MRR (average R$ 149.90 per active tenant)
      const estimatedMrr = activeCount * 149.90;

      chartData.push({
        name: mName,
        mrr: Math.round(estimatedMrr),
        clientes: countAtMonth,
        ativos: activeCount
      });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        mrr: Math.round(mrr * 100) / 100,
        totalTenants: totalTenantsCount,
        activeTrials,
        expiredTrials,
        churnRate,
        totalRevenue,
        plans: {
          starter: starterCount,
          pro: proCount,
          enterprise: enterpriseCount,
          trial: trialCount
        }
      },
      blockedTenants: blockedTenants.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        createdAt: t.createdAt
      })),
      chartData
    });
  } catch (error: any) {
    console.error('Error fetching admin billing metrics:', error);
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ success: false, error: 'Permissão insuficiente' }, { status: 403 });
    }
    if (error.message === 'SUBSCRIPTION_REQUIRED') {
      return NextResponse.json({ success: false, error: 'Assinatura ativa requerida' }, { status: 402 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
