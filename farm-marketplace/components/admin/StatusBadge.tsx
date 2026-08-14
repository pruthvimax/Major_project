import React from 'react';
import Badge, { BadgeTone } from '../ui/Badge';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

/**
 * Maps every admin status string onto a design-system <Badge/> tone.
 * Keep this table exhaustive — admin list screens pass raw API statuses.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  pending: 'warning',
  accepted: 'info',
  confirmed: 'info',
  packed: 'info',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error',
  approved: 'success',
  blocked: 'error',
  rejected: 'error',
  unverified: 'warning',
  verified: 'success',
  paid: 'success',
  failed: 'error',
  disputed: 'error',
  resolved: 'success',
  active: 'success',
  suspended: 'warning',
  locked: 'info',
  released: 'success',
  refunded: 'info',
  none: 'neutral',
  default: 'neutral',
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || 'default';
  const tone = STATUS_TONES[normalized] || STATUS_TONES.default;
  const text = String(label || status || '').toUpperCase();

  return <Badge label={text} tone={tone} size="sm" />;
}
