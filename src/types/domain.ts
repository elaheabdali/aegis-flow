export type Locale = 'fa' | 'en';
export type Direction = 'ltr' | 'rtl';

export type CurrencyUnit = 'IRT' | 'IRR';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TransactionStatus =
  | 'cleared'
  | 'flagged'
  | 'under_review'
  | 'frozen'
  | 'reported_sar';

export type PaymentChannel =
  | 'shaparak_ipg'
  | 'shetab_c2c'
  | 'paya_satna'
  | 'bnpl_wallet'
  | 'crypto_fiat_gateway';

export type ShetabBankId =
  | 'mellat'
  | 'melli'
  | 'saman'
  | 'pasargad'
  | 'saderat'
  | 'parsian'
  | 'ayandeh'
  | 'blu';

export type FraudTypology =
  | 'rented_mule_account'
  | 'shetab_structuring'
  | 'shahkar_identity_mismatch'
  | 'illegal_betting_gateway'
  | 'account_takeover_vpn';

export type AnalystRole = 'senior_investigator' | 'junior_analyst';

export type StreamConnectionMode = 'live_ws' | 'simulated' | 'paused';

export interface RiskFactor {
  readonly code: string;
  readonly weight: number;
  readonly labelKey:
    | 'structuringNearCap'
    | 'rentedAccountVelocity'
    | 'shahkarMismatch'
    | 'foreignDatacenterIp'
    | 'highRiskGatewayBurst';
}

export interface RawTransaction {
  readonly id: string;
  readonly shaparakRrn: string;
  readonly timestamp: string;
  /** Base transaction value in Iranian Toman (IRT); Rial is derived as amountIrt * 10 */
  readonly amountIrt: number;
  readonly channel: PaymentChannel;
  readonly bankId: ShetabBankId;
  readonly merchantNameFa: string;
  readonly merchantNameEn: string;
  readonly merchantCategory: string;
  readonly accountHolderFa: string;
  readonly accountHolderEn: string;
  readonly maskedCardNumber: string;
  readonly rawCardNumber: string;
  readonly maskedIban: string;
  readonly rawIban: string;
  readonly maskedNationalId: string;
  readonly rawNationalId: string;
  readonly originCity: string;
  readonly isForeignIp: boolean;
  readonly shahkarVerified: boolean;
  readonly minutesSinceLastTx: number;
  readonly txCountLastHour: number;
  readonly isNewDevice: boolean;
  readonly ipAddress: string;
  readonly deviceFingerprint: string;
}

export interface Transaction extends RawTransaction {
  readonly riskScore: number;
  readonly severity: RiskSeverity;
  readonly factors: readonly RiskFactor[];
  readonly status: TransactionStatus;
}

export interface StreamFilterState {
  readonly query: string;
  readonly severity: RiskSeverity | 'all';
}

export interface TelemetryMetrics {
  readonly throughputPerSec: number;
  readonly flaggedExposureIrt: number;
  readonly criticalCount: number;
  readonly workerLatencyMs: number;
}

export type WorkerInboundMessage =
  | {
      type: 'INGEST_BATCH';
      payload: readonly RawTransaction[];
    }
  | {
      type: 'UPDATE_FILTERS';
      payload: StreamFilterState;
    }
  | {
      type: 'RESET';
    };

export type WorkerOutboundMessage =
  | {
      type: 'PROCESSED_BATCH';
      payload: {
        readonly accepted: readonly Transaction[];
        readonly totalIngested: number;
        readonly flaggedVolumeDeltaIrt: number;
        readonly criticalDelta: number;
        readonly processingTimeMs: number;
      };
    };

export interface AuditLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly actorRole: AnalystRole;
  readonly action: 'PII_UNMASKED' | 'ACCOUNT_FROZEN' | 'SAR_SUBMITTED' | 'STREAM_PAUSED';
  readonly targetId: string;
  readonly reason: string;
}