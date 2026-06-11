import { prisma } from '../src/server/db/prisma';
import { BillingCalculatorService } from '../src/server/services/billing/billing-calculator.service';
import { InvoiceService } from '../src/server/services/billing/invoice.service';
import { PixPaymentService } from '../src/server/services/billing/pix-payment.service';
import { SubscriptionAccessService } from '../src/server/services/billing/subscription-access.service';
import { PaymentConfirmationService } from '../src/server/services/billing/payment-confirmation.service';

async function runValidation() {
  console.log('🏁 Starting Billing Validation Suite...\n');
  let passedCount = 0;
  let failedCount = 0;

  const assert = (name: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passedCount++;
    } else {
      console.log(`❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failedCount++;
    }
  };

  try {
    // SETUP SEED DATA
    const tenantSlug = 'validation-test-tenant';
    let tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Validation Test Tenant Co.',
          slug: tenantSlug,
          status: 'active'
        }
      });
    }

    const planSlug = 'pro-test';
    let plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          name: 'Pro Test Plan',
          slug: planSlug,
          priceCents: 34900, // R$ 349.00
          billingCycle: 'monthly',
          isActive: true
        }
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: tenant.id }
    }) || await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
      }
    });

    // SCENARIO 1: Full Price Calculation
    const calcFull = await BillingCalculatorService.calculate(tenant.id, plan.id);
    assert(
      'Scenario 1 - Full Price subtotal mapping',
      calcFull.baseAmountCents === 34900 && calcFull.totalCents === 34900,
      `Expected 34900, got ${calcFull.totalCents}`
    );

    // SCENARIO 2: 50% Coupon Discount
    const coupon50Code = 'VAL50';
    let coupon50 = await prisma.coupon.findUnique({ where: { code: coupon50Code } });
    if (!coupon50) {
      coupon50 = await prisma.coupon.create({
        data: {
          code: coupon50Code,
          type: 'percentage',
          value: 50,
          duration: 'once',
          isActive: true
        }
      });
    }
    const calc50 = await BillingCalculatorService.calculate(tenant.id, plan.id, coupon50Code);
    assert(
      'Scenario 2 - 50% Coupon Discount calculation',
      calc50.totalCents === 17450 && calc50.discountCents === 17450,
      `Expected total 17450, got ${calc50.totalCents}`
    );

    // SCENARIO 3: 100% Coupon Discount (Free Access)
    const coupon100Code = 'VAL100';
    let coupon100 = await prisma.coupon.findUnique({ where: { code: coupon100Code } });
    if (!coupon100) {
      coupon100 = await prisma.coupon.create({
        data: {
          code: coupon100Code,
          type: 'free_access',
          value: 100,
          duration: 'forever',
          isActive: true
        }
      });
    }
    const startPeriod = new Date();
    const endPeriod = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const invoice100 = await InvoiceService.generateMonthlyInvoice(
      tenant.id,
      subscription.id,
      startPeriod,
      endPeriod,
      coupon100Code
    );
    assert(
      'Scenario 3 - 100% Free Coupon immediately marks invoice as paid',
      invoice100.status === 'paid' && invoice100.totalCents === 0,
      `Expected paid status & 0 total, got ${invoice100.status} & ${invoice100.totalCents}`
    );

    // SCENARIO 4: Free Access bypass
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'free' }
    });
    const accessFree = await SubscriptionAccessService.checkAccess(tenant.id);
    assert(
      'Scenario 4 - Permanent free status allows access',
      accessFree.hasAccess === true && accessFree.status === 'free',
      `Expected hasAccess=true & status=free, got hasAccess=${accessFree.hasAccess} & status=${accessFree.status}`
    );

    // SCENARIO 5: PIX Payment lifecycle
    // Set to expired trialing status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'trialing',
        currentPeriodStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    });

    const accessExpired = await SubscriptionAccessService.checkAccess(tenant.id);
    assert(
      'Scenario 5.1 - Expired subscription blocks access',
      accessExpired.hasAccess === false && accessExpired.reason === 'trial_expired',
      `Expected block, got hasAccess=${accessExpired.hasAccess}`
    );

    const startPeriod2 = new Date();
    const endPeriod2 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const unpaidInvoice = await InvoiceService.generateMonthlyInvoice(
      tenant.id,
      subscription.id,
      startPeriod2,
      endPeriod2
    );
    assert(
      'Scenario 5.2 - Generated invoice with positive balance has open status',
      unpaidInvoice.status === 'open' && unpaidInvoice.totalCents === 34900,
      `Expected open & 34900, got ${unpaidInvoice.status} & ${unpaidInvoice.totalCents}`
    );

    const pixCharge = await PixPaymentService.generatePixCharge(tenant.id, unpaidInvoice.id);
    assert(
      'Scenario 5.3 - Pix charge generated with copy-paste code',
      pixCharge.status === 'active' && pixCharge.copyPasteCode.includes('Sao%20Paulo'),
      'Expected active charge with valid EMV code structure'
    );

    const paymentConfirm = await PaymentConfirmationService.confirmPayment(
      pixCharge.paymentId!,
      pixCharge.amountCents
    );
    assert(
      'Scenario 5.4 - Payment confirmation returns success',
      paymentConfirm.success === true
    );

    const updatedInvoice = await prisma.invoice.findUnique({ where: { id: unpaidInvoice.id } });
    const updatedSub = await prisma.subscription.findUnique({ where: { id: subscription.id } });
    assert(
      'Scenario 5.5 - Invoice becomes paid and Subscription reactivated for 30 days',
      updatedInvoice?.status === 'paid' && updatedSub?.status === 'active',
      `Invoice: ${updatedInvoice?.status}, Subscription: ${updatedSub?.status}`
    );

    // SCENARIO 6: Overdue billing blocks access
    const overdueInvoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceNumber: `INV-OVERDUE-${Date.now()}`,
        status: 'open',
        subtotalCents: 34900,
        discountCents: 0,
        totalCents: 34900,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Venceu ontem
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const overdueCount = await InvoiceService.checkOverdueInvoices();
    assert(
      'Scenario 6.1 - checkOverdueInvoices catches overdue record',
      overdueCount > 0,
      `Expected > 0, got ${overdueCount}`
    );

    const accessOverdue = await SubscriptionAccessService.checkAccess(tenant.id);
    assert(
      'Scenario 6.2 - Overdue status blocks tenant access',
      accessOverdue.hasAccess === false && accessOverdue.reason === 'subscription_expired',
      `Expected block, got ${accessOverdue.hasAccess}`
    );

    // CLEANUP
    await prisma.invoice.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.subscription.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenantDiscount.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });

    console.log(`\n🏁 Validation Finished: ${passedCount} PASSED, ${failedCount} FAILED`);
  } catch (error) {
    console.error('❌ Validation script encountered an error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runValidation();
