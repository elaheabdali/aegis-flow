import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sanitizeNarrativeInput } from '@/features/security/sanitizer';

const sarPayloadSchema = z.object({
  transactionId: z
    .string()
    .regex(/^SHP-[A-Z0-9]{4,16}$/i, 'INVALID_TRANSACTION_ID_FORMAT'),
  actorRole: z.enum(['senior_investigator', 'junior_analyst']),
  actionType: z.enum(['freeze_and_sar', 'sar_only']),
  typology: z.enum([
    'rented_mule_account',
    'shetab_structuring',
    'shahkar_identity_mismatch',
    'illegal_betting_gateway',
    'account_takeover_vpn',
  ]),
  analystNotes: z.string().min(15).max(2000),
  digitalSignature: z.string().min(3).max(120),
  faultSimulation: z.enum(['none', 'server_error', 'timeout']).default('none'),
});

export async function POST(request: NextRequest) {
  // 1. Custom CSRF Header + Same-Origin Verification
  const csrfHeader = request.headers.get('x-aegis-csrf');
  if (!csrfHeader || csrfHeader !== 'aegis-workbench-client') {
    return NextResponse.json(
      { error: 'CSRF_VALIDATION_FAILED' },
      { status: 403 }
    );
  }

  const originHeader = request.headers.get('origin');
  const hostHeader = request.headers.get('host');
  if (originHeader && hostHeader) {
    try {
      const originUrl = new URL(originHeader);
      if (originUrl.host !== hostHeader) {
        return NextResponse.json(
          { error: 'CROSS_ORIGIN_REQUEST_BLOCKED' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'MALFORMED_ORIGIN_HEADER' },
        { status: 400 }
      );
    }
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json(
      { error: 'UNSUPPORTED_MEDIA_TYPE' },
      { status: 415 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = sarPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // 2. Server-Side RBAC Enforcement (Prevents client-side disabled attribute bypass)
  if (
    data.actorRole === 'junior_analyst' &&
    data.actionType === 'freeze_and_sar'
  ) {
    return NextResponse.json(
      { error: 'RBAC_FORBIDDEN_INSUFFICIENT_PRIVILEGES' },
      { status: 403 }
    );
  }

  // 3. Resilience Fault Injection Simulation
  if (data.faultSimulation === 'timeout') {
    await new Promise((resolve) => setTimeout(resolve, 3500));
    return NextResponse.json(
      { error: 'UPSTREAM_GATEWAY_TIMEOUT' },
      { status: 504 }
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 650));

  if (data.faultSimulation === 'server_error') {
    return NextResponse.json(
      { error: 'FIU_COMPLIANCE_LEDGER_UNAVAILABLE' },
      { status: 500 }
    );
  }

  const sanitizedNotes = sanitizeNarrativeInput(data.analystNotes);
  const sanitizedSignature = sanitizeNarrativeInput(data.digitalSignature);

  return NextResponse.json({
    ok: true,
    filingReference: `FIU-SHP-${Date.now().toString(36).toUpperCase()}`,
    transactionId: data.transactionId,
    appliedStatus:
      data.actionType === 'freeze_and_sar' ? 'frozen' : 'reported_sar',
    sanitizedNotes,
    sanitizedSignature,
    processedAt: new Date().toISOString(),
  });
}