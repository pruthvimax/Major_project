/**
 * Payment Service - Razorpay Integration
 *
 * Handles Razorpay order creation and payment verification.
 * Uses HMAC-SHA256 to verify webhook/callback payment signatures.
 *
 * Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env
 */
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';

function isRazorpayEnabled(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
}

export interface RazorpayOrderResult {
  success: boolean;
  razorpayOrderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

/**
 * Creates a Razorpay order for a given amount (in INR paise).
 * Returns the order details for the frontend to initiate payment.
 */
export const createRazorpayOrder = async (
  amountInRupees: number,
  orderNumber: string
): Promise<RazorpayOrderResult> => {
  if (!isRazorpayEnabled()) {
    console.warn('[Payment] Razorpay keys not configured — returning mock order for development.');
    // In development/testing without Razorpay keys, return a mock response
    return {
      success: true,
      razorpayOrderId: `mock_order_${Date.now()}`,
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      keyId: 'rzp_test_mock',
    };
  }

  try {
    const amountInPaise = Math.round(amountInRupees * 100);

    const response = await fetch(`${RAZORPAY_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: orderNumber,
        payment_capture: 1,
      }),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      console.error('[Payment] Razorpay order creation failed:', data);
      return { success: false, error: data?.error?.description || 'Payment initiation failed' };
    }

    console.log(`[Payment] Razorpay order created: ${data.id} for ₹${amountInRupees}`);
    return {
      success: true,
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId: RAZORPAY_KEY_ID,
    };
  } catch (error: any) {
    console.error('[Payment] Razorpay API error:', error);
    return { success: false, error: 'Payment service unavailable' };
  }
};

/**
 * Verifies the Razorpay payment signature from the frontend callback.
 * razorpay_signature = HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
 */
export const verifyRazorpayPayment = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean => {
  if (!isRazorpayEnabled()) {
    // In mock mode, accept any signature
    console.warn('[Payment] Razorpay in mock mode — skipping signature verification.');
    return true;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = expectedSignature === razorpaySignature;
  if (!isValid) {
    console.error('[Payment] Razorpay signature mismatch!');
  }
  return isValid;
};
