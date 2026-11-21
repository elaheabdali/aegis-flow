export type Locale = 'en' | 'fa';
export type Direction = 'ltr' | 'rtl';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TransactionStatus =
  | 'cleared'
  | 'flagged'
  | 'under_review'
  | 'frozen'
  | 'reported_sar';

export type FraudTypology =
  | 'account_takeover'
  | 'card_testing'
  | 'velocity_abuse'
  | 'geo_impossible_travel'
  | 'synthetic_identity';

export type AnalystRole = 'senior_investigator' | 'junior_analyst';

export type StreamConnectionMode = 'live_ws' | 'simulated' | 'paused';

export interface RiskFactor {
  readonly code: string;
  readonly weight: number;
  readonly labelKey:
    | 'highAmountAnomaly'
    | 'impossibleTravel'
    | 'velocityBurst'
    | 'highRiskMerchant'
    | 'newDeviceFingerprint';
}

export interface RawTransaction {
  readonly id: string;
  readonly timestamp: string;
  readonly amount: number;
  readonly currency: 'USD' | 'EUR';
  readonly merchantName: string;
  readonly merchantCategory: string;
  readonly accountHolder: string;
  readonly maskedCardNumber: string;
  readonly rawCardNumber: string;
  readonly originCountry: string;
  readonly previousCountry: string;
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
  readonly flaggedExposureUsd: number;
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
        readonly flaggedVolumeDelta: number;
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