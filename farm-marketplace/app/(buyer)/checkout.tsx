import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';

type PaymentMethod = 'cash' | 'bank_transfer' | 'blockchain' | 'razorpay';

export default function CheckoutScreen() {
  const colors = useColors();
  const { items: cartItems, summary: cartSummary, clearCart, refreshCart } = useCart();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: Layout.spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: Layout.spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  scrollContent: {
    padding: Layout.spacing.md,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
    marginBottom: Layout.spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    marginBottom: Layout.spacing.md,
  },
  itemName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  itemSeller: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginTop: 2,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.black,
    marginRight: Layout.spacing.md,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: colors.lighterGray,
  },
  qtyBtn: {
    padding: Layout.spacing.sm,
  },
  qtyText: {
    paddingHorizontal: Layout.spacing.md,
    fontWeight: 'bold',
    fontSize: Typography.fontSize.md,
  },
  maxQty: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginLeft: Layout.spacing.md,
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.lighterGray,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Layout.borderRadius.sm,
    height: 48,
    paddingHorizontal: Layout.spacing.md,
    fontSize: Typography.fontSize.sm,
    color: colors.black,
    marginBottom: Layout.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  textArea: {
    height: 80,
    paddingTop: Layout.spacing.sm,
    textAlignVertical: 'top',
  },
  paymentCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  paymentOptionActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '05',
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentOptionText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.gray,
    marginLeft: Layout.spacing.sm,
  },
  paymentOptionTextActive: {
    color: colors.secondary,
  },
  paymentDesc: {
    fontSize: Typography.fontSize.xs,
    color: colors.gray,
    marginLeft: 28,
    lineHeight: 16,
  },
  totalCard: {
    backgroundColor: colors.card,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Layout.spacing.xxl,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.sm,
  },
  pricingLabel: {
    color: colors.gray,
    fontSize: Typography.fontSize.sm,
  },
  pricingValue: {
    fontWeight: 'bold',
    fontSize: Typography.fontSize.sm,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Layout.spacing.md,
    marginTop: Layout.spacing.sm,
  },
  grandTotalLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.black,
  },
  grandTotalValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.secondary,
  },
  checkoutBtn: {
    backgroundColor: colors.secondary,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
    marginTop: Layout.spacing.lg,
  },
  checkoutBtnUpi: {
    backgroundColor: '#5F3DC4',
  },
  checkoutBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: Typography.fontSize.md,
  },
  recommendedBadge: {
    backgroundColor: colors.secondary,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: Layout.spacing.sm,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
}), [colors]);
  const params = useLocalSearchParams();
  const fromCart = params.fromCart === '1';
  const productId = params.productId as string;
  const productName = params.name as string;
  const productPrice = parseFloat((params.price as string) || '0');
  const productUnit = params.unit as string;
  const farmerName = params.farmerName as string;
  const maxQty = parseInt((params.availableQuantity as string) || '1', 10);

  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('blockchain');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (fromCart) refreshCart();
  }, [fromCart, refreshCart]);

  const cartOrderGroups = useMemo(() => {
    if (!fromCart) return [];
    const groups: Record<string, { farmerId: string; farmerName: string; items: any[] }> = {};
    for (const item of cartItems) {
      const product: any = typeof item.product === 'string' ? null : item.product;
      if (!product) continue;
      const farmerId = product.farmer?._id || product.farmer?.email || 'unknown';
      if (!groups[farmerId]) {
        groups[farmerId] = {
          farmerId,
          farmerName: product.farmer?.name || 'Farmer',
          items: [],
        };
      }
      groups[farmerId].items.push({
        productId: product._id,
        quantity: item.quantity,
        name: product.name,
        price: item.price,
        unit: item.unit,
      });
    }
    return Object.values(groups);
  }, [fromCart, cartItems]);

  const incrementQty = () => {
    if (quantity < maxQty) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const placeSingleOrder = async (orderItems: { productId: string; quantity: number }[], clearAfter: boolean) => {
    const response = await api.post('/orders', {
      items: orderItems,
      shippingAddress: { address, city, state, pincode, country: 'India' },
      paymentMethod,
      notes,
      clearCart: clearAfter,
    });
    return response.data;
  };

  const handlePlaceOrder = async () => {
    if (!address || !city || !state || !pincode) {
      showAlert('Error', 'Please fill in all shipping address fields');
      return;
    }

    if (!/^[0-9]{6}$/.test(pincode)) {
      showAlert('Error', 'Please provide a valid 6-digit pincode');
      return;
    }

    if (fromCart && cartOrderGroups.length === 0) {
      showAlert('Error', 'Your cart is empty');
      return;
    }

    setIsLoading(true);

    try {
      let lastOrder: any = null;

      if (fromCart) {
        // One order per farmer (marketplace rule)
        for (let i = 0; i < cartOrderGroups.length; i++) {
          const group = cartOrderGroups[i];
          const data = await placeSingleOrder(
            group.items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
            i === cartOrderGroups.length - 1
          );
          if (data.success) lastOrder = data.order;
        }
        await clearCart();
      } else {
        const data = await placeSingleOrder([{ productId, quantity }], false);
        if (data.success) lastOrder = data.order;
      }

      if (lastOrder) {
        if (paymentMethod === 'razorpay') {
          try {
            const payRes = await api.post('/payments/razorpay/create', { orderId: lastOrder._id });
            if (payRes.data.success) {
              const { razorpayOrderId, amount, keyId } = payRes.data.payment;
              const upiUrl = `upi://pay?pa=pay_${keyId}@razorpay&pn=FarmMarketplace&tr=${razorpayOrderId}&am=${(amount / 100).toFixed(2)}&cu=INR&tn=Order ${lastOrder.orderNumber}`;
              const supported = await Linking.canOpenURL(upiUrl);

              if (supported) {
                await Linking.openURL(upiUrl);
                showAlert(
                  'Complete Payment',
                  'Complete the payment in your UPI app. Once done, come back to confirm your order.',
                  () => router.replace('/(buyer)/orders')
                );
              } else {
                await api.post('/payments/razorpay/verify', {
                  orderId: lastOrder._id,
                  razorpayOrderId,
                  razorpayPaymentId: `pay_mock_${Date.now()}`,
                  razorpaySignature: 'mock_signature',
                });
                showAlert('Order Confirmed', 'Payment processed successfully!', () =>
                  router.replace('/(buyer)/orders')
                );
              }
            }
          } catch (payErr) {
            console.error('Razorpay initiation error:', payErr);
            showAlert('Payment Error', 'Could not initiate payment. Please try another method.');
          }
        } else {
          let successMessage = fromCart
            ? `${cartOrderGroups.length} order(s) placed successfully!`
            : 'Your order has been placed successfully!';
          if (paymentMethod === 'blockchain' && lastOrder.blockchainTxHash) {
            successMessage += `\n\n⛓️ Escrow Transaction Verified!\nTx: ${lastOrder.blockchainTxHash.substring(0, 20)}...`;
          }
          showAlert('Success', successMessage, () => router.replace('/(buyer)/orders'));
        }
      }
    } catch (error: any) {
      console.error('Order creation failed:', error);
      const errorMsg = error.response?.data?.message || 'Something went wrong. Please try again.';
      showAlert('Order Failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = fromCart ? cartSummary.totalAmount : productPrice * quantity;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {fromCart ? (
              cartOrderGroups.map((group) => (
                <View key={group.farmerId} style={[styles.itemCard, { marginBottom: 8 }]}>
                  <Text style={styles.itemSeller}>Farmer: {group.farmerName}</Text>
                  {group.items.map((it) => (
                    <View key={it.productId} style={{ marginTop: 8 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={{ color: colors.gray, fontSize: 13 }}>
                        {it.quantity} {it.unit} × ₹{it.price} = ₹{(it.quantity * it.price).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{productName}</Text>
                  <Text style={styles.itemSeller}>Farmer: {farmerName}</Text>
                </View>

                <View style={styles.quantityRow}>
                  <Text style={styles.qtyLabel}>Quantity:</Text>
                  <View style={styles.qtySelector}>
                    <TouchableOpacity onPress={decrementQty} style={styles.qtyBtn}>
                      <Ionicons name="remove" size={16} color={colors.black} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity onPress={incrementQty} style={styles.qtyBtn}>
                      <Ionicons name="add" size={16} color={colors.black} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.maxQty}>Max: {maxQty}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.addressCard}>
              <TextInput
                style={styles.input}
                placeholder="Street Address"
                placeholderTextColor={colors.gray}
                value={address}
                onChangeText={setAddress}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: Layout.spacing.sm }]}
                  placeholder="City"
                  placeholderTextColor={colors.gray}
                  value={city}
                  onChangeText={setCity}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="State"
                  placeholderTextColor={colors.gray}
                  value={state}
                  onChangeText={setState}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Pincode (6 digits)"
                placeholderTextColor={colors.gray}
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes for farmer (optional)"
                placeholderTextColor={colors.gray}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <View style={styles.paymentCard}>
              {/* Razorpay UPI */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'razorpay' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('razorpay')}
              >
                <View style={styles.paymentOptionHeader}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color={paymentMethod === 'razorpay' ? colors.secondary : colors.gray}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'razorpay' && styles.paymentOptionTextActive,
                    ]}
                  >
                    UPI / Razorpay
                  </Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMMENDED</Text>
                  </View>
                </View>
                <Text style={styles.paymentDesc}>
                  Pay instantly via GPay, PhonePe, Paytm, or any UPI app.
                </Text>
              </TouchableOpacity>

              {/* Blockchain Escrow */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'blockchain' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('blockchain')}
              >
                <View style={styles.paymentOptionHeader}>
                  <Ionicons
                    name="link"
                    size={20}
                    color={paymentMethod === 'blockchain' ? colors.secondary : colors.gray}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'blockchain' && styles.paymentOptionTextActive,
                    ]}
                  >
                    Blockchain Smart Escrow
                  </Text>
                </View>
                <Text style={styles.paymentDesc}>
                  Funds secured on-chain, released only after delivery confirmation.
                </Text>
              </TouchableOpacity>

              {/* Cash on Delivery */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cash' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <View style={styles.paymentOptionHeader}>
                  <Ionicons
                    name="cash-outline"
                    size={20}
                    color={paymentMethod === 'cash' ? colors.secondary : colors.gray}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'cash' && styles.paymentOptionTextActive,
                    ]}
                  >
                    Cash on Delivery
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Bank Transfer */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'bank_transfer' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('bank_transfer')}
              >
                <View style={styles.paymentOptionHeader}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={paymentMethod === 'bank_transfer' ? colors.secondary : colors.gray}
                  />
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === 'bank_transfer' && styles.paymentOptionTextActive,
                    ]}
                  >
                    Direct Bank Transfer
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Pricing Details & Checkout Button */}
          <View style={styles.totalCard}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>
                {fromCart
                  ? `Subtotal (${cartSummary.itemCount} items)`
                  : `Price (${quantity} x ₹${productPrice})`}
              </Text>
              <Text style={styles.pricingValue}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Delivery Fee</Text>
              <Text style={[styles.pricingValue, { color: '#2E7D32' }]}>Free</Text>
            </View>
            <View style={[styles.pricingRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>₹{totalPrice.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutBtn,
                paymentMethod === 'razorpay' && styles.checkoutBtnUpi,
              ]}
              onPress={handlePlaceOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.checkoutBtnText}>
                  {paymentMethod === 'razorpay'
                    ? '💳 Pay via UPI / Razorpay'
                    : paymentMethod === 'blockchain'
                    ? '⛓️ Place Escrow Order'
                    : '📦 Place Order'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

