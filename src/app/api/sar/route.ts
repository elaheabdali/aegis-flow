import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sanitizeNarrativeInput } from '@/features/security/sanitizer';

const sarPayloadSchema = z.object({
  transactionId: z.string().min(3),
  actionType: z.enum(['freeze_and_sar', 'sar_only']),
  typology: z.enum([
    'account_takeover',
    'card_testing',
    'velocity_abuse',
    'geo_impossible_travel',
    'synthetic_identity',
  ]),
  analystNotes: z.string().min(15).max(2000),
  digitalSignature: z.string().min(3).max(120),
  faultSimulation: z.enum(['none', 'server_error', 'timeout']).default('none'),
});

export async function POST(request: NextRequest) {
  // 1. CSRF Custom Header Verification
  const csrfHeader = request.headers.get('x-aegis-csrf');
  if (!csrfHeader || csrfHeader !== 'aegis-workbench-client') {
    return NextResponse.json(
      { error: 'CSRF_VALIDATION_FAILED' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  // 2. Strict Server-Side Zod Schema Validation
  const parsed = sarPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // 3. Controlled Fault Simulation for Testing Optimistic UI Rollbacks
  if (data.faultSimulation === 'timeout') {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    return NextResponse.json({ error: 'UPSTREAM_GATEWAY_TIMEOUT' }, { status: 504 });
  }

  // Realistic BFF processing delay
  await new Promise((resolve) => setTimeout(resolve, 650));

  if (data.faultSimulation === 'server_error') {
    return NextResponse.json(
      { error: 'COMPLIANCE_LEDGER_UNAVAILABLE' },
      { status: 500 }
    );
  }

  // 4. Sanitize Narrative Before Persistence
  const sanitizedNotes = sanitizeNarrativeInput(data.analystNotes);

  return NextResponse.json({
    ok: true,
    filingReference: `SAR-${Date.now().toString(36).toUpperCase()}`,
    transactionId: data.transactionId,
    appliedStatus: data.actionType === 'freeze_and_sar' ? 'frozen' : 'reported_sar',
    sanitizedNotes,
    processedAt: new Date().toISOString(),
  });
}