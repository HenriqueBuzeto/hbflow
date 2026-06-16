import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, "Nome do plano deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "Slug do plano deve ter pelo menos 2 caracteres"),
  priceCents: z.number().int().nonnegative("Preço não pode ser negativo"),
  billingCycle: z.enum(['monthly', 'yearly']),
  featuresJson: z.string().optional().default("{}"),
  isActive: z.boolean().optional().default(true)
});

export const updatePlanSchema = createPlanSchema.partial();

export const createCouponSchema = z.object({
  code: z.string().min(2, "Código deve ter pelo menos 2 caracteres").toUpperCase(),
  type: z.enum(['percentage', 'fixed_amount', 'free_access']),
  value: z.number().nonnegative("Valor não pode ser negativo"),
  duration: z.enum(['once', 'months', 'forever']),
  durationMonths: z.number().int().positive().nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  validFrom: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  validUntil: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  isActive: z.boolean().optional().default(true)
});

export const updateCouponSchema = createCouponSchema.partial();

export const applyTenantDiscountSchema = z.object({
  couponId: z.string().uuid().nullable().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'free_access']),
  value: z.number().nonnegative("Valor não pode ser negativo"),
  reason: z.string().min(3, "Descreva o motivo do desconto"),
  startsAt: z.string().datetime().optional().or(z.date().optional()),
  endsAt: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
  isActive: z.boolean().optional().default(true)
});

export const generateInvoiceSchema = z.object({
  tenantId: z.string().min(1, "ID do Tenant é obrigatório"),
  billingPeriodStart: z.string().datetime().or(z.date()),
  billingPeriodEnd: z.string().datetime().or(z.date()),
  planSlug: z.string().optional()
});

export const confirmPaymentSchema = z.object({
  amountCents: z.number().int().positive("Valor do pagamento deve ser maior que zero")
});

export const createPixChargeSchema = z.object({
  amountCents: z.number().int().positive("Valor da cobrança deve ser maior que zero")
});

export const createInfinitePayLinkSchema = z.object({});

export const infinitePayWebhookSchema = z.object({
  invoice_slug: z.string(),
  amount: z.number().int(),
  paid_amount: z.number().int(),
  installments: z.number().int().optional().default(1),
  capture_method: z.string().optional().default('pix'),
  transaction_nsu: z.string(),
  order_nsu: z.string(),
  receipt_url: z.string().optional().nullable()
});

export const paymentCheckSchema = z.object({
  transaction_nsu: z.string().optional(),
  slug: z.string().optional()
});
