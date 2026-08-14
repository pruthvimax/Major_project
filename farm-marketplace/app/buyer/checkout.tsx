import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useColors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Layout from '../../constants/Layout';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import {
  ScreenHeader,
  SectionHeader,
  Card,
  Input,
  Button,
  Badge,
  QuantityStepper,
} from '../../components/ui';

type PaymentMethod = 'cash' | 'bank_transfer' | 'blockchain' | 'razorpay';

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items: cartItems, summary: cartSummary, clearCart, refreshCart } = useCart();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          padding: Layout.spacing.lg,
          paddingBottom: Layout.spacing.xxl,
        },
        section: {
          marginBottom: Layout.spacing.xl,
        },
        summaryGroupCard: {
          padding: Layout.spacing.lg,
          marginBottom: Layout.spacing.md,
        },
        card: {
          padding: Layout.spacing.lg,
        },
        farmerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.spacing.sm,
        },
        farmerIconWell: {
          width: 34,
          height: 34,
          borderRadius: Layout.borderRadius.md,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        itemSeller: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          fontWeight: Typography.fontWeight.semibold,
        },
        groupItem: {
          marginTop: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        itemName: {
          fontSize: Typography.fontSize.md,
          lineHeight: Typography.leading.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          flexShrink: 1,
        },
        itemMeta: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        itemMetaValue: {
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
        },
        itemHeader: {
          marginBottom: Layout.spacing.md,
        },
        quantityRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: Layout.spacing.md,
          paddingTop: Layout.spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        qtyLabel: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.semibold,
          color: colors.text,
          flexShrink: 1,
        },
        maxQty: {
          fontSize: Typography.fontSize.xs,
          color: colors.textSecondary,
          marginLeft: 'auto',
        },
        inputRow: {
          flexDirection: 'row',
          gap: Layout.spacing.md,
        },
        inputHalf: {
          flex: 1,
        },
        paymentOption: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: Layout.spacing.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: Layout.borderRadius.md,
          padding: Layout.spacing.md,
          marginBottom: Layout.spacing.sm,
          backgroundColor: colors.surface,
          minHeight: Layout.touchTarget,
        },
        paymentOptionActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primaryTint,
        },
        paymentIconWell: {
          width: 40,
          height: 40,
          borderRadius: Layout.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
        },
        paymentIconWellActive: {
          backgroundColor: colors.primarySoft,
        },
        paymentBody: {
          flex: 1,
          minWidth: 0,
        },
        paymentTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: Layout.spacing.sm,
        },
        paymentOptionText: {
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          flexShrink: 1,
        },
        paymentOptionTextActive: {
          color: colors.primary,
        },
        paymentDesc: {
          fontSize: Typography.fontSize.xs,
          lineHeight: Typography.leading.xs,
          color: colors.textSecondary,
          marginTop: Layout.spacing.xs,
        },
        radio: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        },
        radioActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary,
        },
        pricingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: Layout.spacing.md,
          marginBottom: Layout.spacing.sm,
        },
        pricingLabel: {
          flexShrink: 1,
          color: colors.textSecondary,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
        },
        pricingValue: {
          fontWeight: Typography.fontWeight.semibold,
          fontSize: Typography.fontSize.sm,
          lineHeight: Typography.leading.sm,
          color: colors.text,
        },
        pricingValueFree: {
          color: colors.primary,
          fontWeight: Typography.fontWeight.bold,
        },
        grandTotalRow: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: Layout.spacing.md,
          marginTop: Layout.spacing.sm,
          marginBottom: 0,
        },
        grandTotalLabel: {
          fontSize: Typography.fontSize.md,
          fontWeight: Typography.fontWeight.bold,
          color: colors.text,
          flexShrink: 1,
        },
        grandTotalValue: {
          fontSize: Typography.fontSize.xl,
          lineHeight: Typography.leading.xl,
          fontWeight: Typography.fontWeight.extrabold,
          color: colors.primary,
        },
        bottomBar: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: Layout.spacing.lg,
          paddingTop: Layout.spacing.md,
          paddingBottom: Math.max(insets.bottom, Layout.spacing.md) + Layout.spacing.md,
          ...Layout.shadow.lg,
        },
      }),
    [colors, insets.bottom]
  );
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
  /** Display-only: reveals the inline copy of the validation already run below. */
  const [showFieldErrors, setShowFieldErrors] = useState(false);

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
    setShowFieldErrors(true);

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
                  () => router.replace('/buyer/orders')
                );
              } else {
                await api.post('/payments/razorpay/verify', {
                  orderId: lastOrder._id,
                  razorpayOrderId,
                  razorpayPaymentId: `pay_mock_${Date.now()}`,
                  razorpaySignature: 'mock_signature',
                });
                showAlert('Order Confirmed', 'Payment processed successfully!', () =>
                  router.replace('/buyer/orders')
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
          showAlert('Success', successMessage, () => router.replace('/buyer/orders'));
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

  const addressError = showFieldErrors && !address ? 'Street address is required' : undefined;
  const cityError = showFieldErrors && !city ? 'City is required' : undefined;
  const stateError = showFieldErrors && !state ? 'State is required' : undefined;
  const pincodeError = showFieldErrors
    ? !pincode
      ? 'Pincode is required'
      : !/^[0-9]{6}$/.test(pincode)
      ? 'Enter a valid 6-digit pincode'
      : undefined
    : undefined;

  const paymentOptions: {
    value: PaymentMethod;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description?: string;
    recommended?: boolean;
  }[] = [
    {
      value: 'razorpay',
      label: 'UPI / Razorpay',
      icon: 'phone-portrait-outline',
      description: 'Pay instantly via GPay, PhonePe, Paytm, or any UPI app.',
      recommended: true,
    },
    {
      value: 'blockchain',
      label: 'Blockchain Smart Escrow',
      icon: 'link',
      description: 'Funds secured on-chain, released only after delivery confirmation.',
    },
    { value: 'cash', label: 'Cash on Delivery', icon: 'cash-outline' },
    { value: 'bank_transfer', label: 'Direct Bank Transfer', icon: 'business-outline' },
  ];

  const ctaTitle =
    paymentMethod === 'razorpay'
      ? 'Pay via UPI / Razorpay'
      : paymentMethod === 'blockchain'
      ? 'Place Escrow Order'
      : 'Place Order';

  const ctaIcon: keyof typeof Ionicons.glyphMap =
    paymentMethod === 'razorpay'
      ? 'card-outline'
      : paymentMethod === 'blockchain'
      ? 'link'
      : 'cube-outline';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScreenHeader title="Checkout" onBack={() => router.back()} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Summary */}
          <View style={styles.section}>
            <SectionHeader title="Order Summary" />
            {fromCart ? (
              cartOrderGroups.map((group) => (
                <Card key={group.farmerId} padded={false} style={styles.summaryGroupCard}>
                  <View style={styles.farmerRow}>
                    <View style={styles.farmerIconWell}>
                      <Ionicons name="person-outline" size={17} color={colors.primary} />
                    </View>
                    <Text style={[styles.itemSeller, { flex: 1 }]} numberOfLines={1}>
                      Farmer: {group.farmerName}
                    </Text>
                  </View>
                  {group.items.map((it) => (
                    <View key={it.productId} style={styles.groupItem}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {it.name}
                      </Text>
                      <Text style={styles.itemMeta} numberOfLines={2}>
                        {it.quantity} {it.unit} × ₹{it.price} ={' '}
                        <Text style={styles.itemMetaValue}>
                          ₹{(it.quantity * it.price).toFixed(2)}
                        </Text>
                      </Text>
                    </View>
                  ))}
                </Card>
              ))
            ) : (
              <Card padded={false} style={styles.card}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {productName}
                  </Text>
                  <Text style={styles.itemSeller} numberOfLines={1}>
                    Farmer: {farmerName}
                  </Text>
                  <Text style={styles.itemMeta} numberOfLines={1}>
                    <Text style={styles.itemMetaValue}>₹{productPrice}</Text>
                    {productUnit ? ` / ${productUnit}` : ''}
                  </Text>
                </View>

                <View style={styles.quantityRow}>
                  <Text style={styles.qtyLabel}>Quantity</Text>
                  <QuantityStepper
                    value={quantity}
                    onDecrease={decrementQty}
                    onIncrease={incrementQty}
                    min={1}
                    max={maxQty}
                  />
                  <Text style={styles.maxQty}>Max: {maxQty}</Text>
                </View>
              </Card>
            )}
          </View>

          {/* Shipping Address */}
          <View style={styles.section}>
            <SectionHeader title="Shipping Address" subtitle="Where should we deliver your order?" />
            <Card padded={false} style={styles.card}>
              <Input
                label="Street Address"
                icon="home-outline"
                required
                placeholder="House no., street, area"
                value={address}
                onChangeText={setAddress}
                error={addressError}
              />
              <View style={styles.inputRow}>
                <Input
                  containerStyle={styles.inputHalf}
                  label="City"
                  icon="business-outline"
                  required
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                  error={cityError}
                />
                <Input
                  containerStyle={styles.inputHalf}
                  label="State"
                  icon="map-outline"
                  required
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                  error={stateError}
                />
              </View>
              <Input
                label="Pincode"
                icon="location-outline"
                required
                placeholder="6-digit pincode"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
                maxLength={6}
                error={pincodeError}
              />
              <Input
                label="Notes for farmer"
                icon="chatbubble-ellipses-outline"
                placeholder="Anything the farmer should know? (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                containerStyle={{ marginBottom: 0 }}
              />
            </Card>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <SectionHeader title="Select Payment Method" />
            <Card padded={false} style={styles.card}>
              {paymentOptions.map((option, idx) => {
                const active = paymentMethod === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.paymentOption,
                      active && styles.paymentOptionActive,
                      idx === paymentOptions.length - 1 && { marginBottom: 0 },
                    ]}
                    onPress={() => setPaymentMethod(option.value)}
                  >
                    <View
                      style={[
                        styles.paymentIconWell,
                        active && styles.paymentIconWellActive,
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={active ? colors.primary : colors.muted}
                      />
                    </View>

                    <View style={styles.paymentBody}>
                      <View style={styles.paymentTitleRow}>
                        <Text
                          style={[
                            styles.paymentOptionText,
                            active && styles.paymentOptionTextActive,
                          ]}
                          numberOfLines={2}
                        >
                          {option.label}
                        </Text>
                        {option.recommended && (
                          <Badge label="RECOMMENDED" tone="primary" />
                        )}
                      </View>
                      {!!option.description && (
                        <Text style={styles.paymentDesc}>{option.description}</Text>
                      )}
                    </View>

                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <Ionicons name="checkmark" size={13} color={colors.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>

          {/* Pricing Details */}
          <View style={styles.section}>
            <SectionHeader title="Price Details" />
            <Card padded={false} style={styles.card}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel} numberOfLines={2}>
                  {fromCart
                    ? `Subtotal (${cartSummary.itemCount} items)`
                    : `Price (${quantity} x ₹${productPrice})`}
                </Text>
                <Text style={styles.pricingValue}>₹{totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Delivery Fee</Text>
                <Text style={[styles.pricingValue, styles.pricingValueFree]}>Free</Text>
              </View>
              <View style={[styles.pricingRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue} numberOfLines={1}>
                  ₹{totalPrice.toFixed(2)}
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Button
            title={ctaTitle}
            icon={ctaIcon}
            size="lg"
            loading={isLoading}
            disabled={isLoading}
            onPress={handlePlaceOrder}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
