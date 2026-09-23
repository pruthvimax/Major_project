/**
 * Shared display helpers for Agri Agent logistics statuses.
 * Backend source of truth: backend/src/services/logisticsIntegrationService.ts
 */
import type { Ionicons } from '@expo/vector-icons';
import type { BadgeTone } from '../components/ui';

export type LogisticsStatus =
  | 'PENDING'
  | 'PICKUP_ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED_DELIVERY'
  | 'RETURNED';

export const LOGISTICS_LABELS: Record<LogisticsStatus, string> = {
  PENDING: 'Awaiting driver',
  PICKUP_ASSIGNED: 'Driver assigned',
  ACCEPTED: 'Driver assigned',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Delivery cancelled',
  FAILED_DELIVERY: 'Delivery failed',
  RETURNED: 'Returned',
};

export const LOGISTICS_TONES: Record<LogisticsStatus, BadgeTone> = {
  PENDING: 'warning',
  PICKUP_ASSIGNED: 'info',
  ACCEPTED: 'info',
  PICKED_UP: 'info',
  IN_TRANSIT: 'primary',
  OUT_FOR_DELIVERY: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'error',
  FAILED_DELIVERY: 'error',
  RETURNED: 'error',
};

export const LOGISTICS_ICONS: Record<LogisticsStatus, keyof typeof Ionicons.glyphMap> = {
  PENDING: 'hourglass-outline',
  PICKUP_ASSIGNED: 'person-outline',
  ACCEPTED: 'person-outline',
  PICKED_UP: 'cube-outline',
  IN_TRANSIT: 'car-outline',
  OUT_FOR_DELIVERY: 'bicycle-outline',
  DELIVERED: 'checkmark-done-outline',
  CANCELLED: 'close-circle-outline',
  FAILED_DELIVERY: 'alert-circle-outline',
  RETURNED: 'return-down-back-outline',
};

/** Four farmer-facing stages (Phase 10). */
export const FARMER_LOGISTICS_STAGES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Driver Assigned', icon: 'person-outline' },
  { label: 'Picked Up', icon: 'cube-outline' },
  { label: 'In Transit', icon: 'car-outline' },
  { label: 'Delivered', icon: 'checkmark-done-outline' },
];

/** Index into FARMER_LOGISTICS_STAGES reached so far (-1 = none yet). */
export const farmerStageIndex = (status?: string | null): number => {
  switch (status) {
    case 'PICKUP_ASSIGNED':
    case 'ACCEPTED':
      return 0;
    case 'PICKED_UP':
      return 1;
    case 'IN_TRANSIT':
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    default:
      return -1;
  }
};

export const isLogisticsFailure = (status?: string | null) =>
  status === 'CANCELLED' || status === 'FAILED_DELIVERY' || status === 'RETURNED';

export const logisticsLabel = (status?: string | null) =>
  (status && LOGISTICS_LABELS[status as LogisticsStatus]) || 'Not assigned';
