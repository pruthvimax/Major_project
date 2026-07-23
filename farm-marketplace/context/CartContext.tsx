import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface CartProduct {
  _id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
  isAvailable: boolean;
  images?: string[];
  blockchainId?: number;
  farmer?: { _id?: string; name: string; email?: string };
}

export interface CartItem {
  product: CartProduct | string;
  quantity: number;
  price: number;
  unit: string;
}

interface CartSummary {
  itemCount: number;
  subtotal: number;
  totalAmount: number;
}

interface CartContextValue {
  items: CartItem[];
  summary: CartSummary;
  loading: boolean;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<{ success: boolean; message: string }>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const emptySummary: CartSummary = { itemCount: 0, subtotal: 0, totalAmount: 0 };

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(emptySummary);
  const [loading, setLoading] = useState(false);

  const applyResponse = (data: any) => {
    setItems(data.cart?.items || []);
    setSummary(data.summary || emptySummary);
  };

  const refreshCart = useCallback(async () => {
    try {
      // Cart is buyer-only — skip for farmers and admins to avoid 403
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role !== 'buyer') {
          setItems([]);
          setSummary(emptySummary);
          return;
        }
      } else {
        // Not logged in yet
        return;
      }

      setLoading(true);
      const res = await api.get('/cart');
      if (res.data.success) applyResponse(res.data);
    } catch (error) {
      setItems([]);
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (productId: string, quantity = 1) => {
    try {
      const res = await api.post('/cart/items', { productId, quantity });
      if (res.data.success) {
        applyResponse(res.data);
        return { success: true, message: 'Added to cart' };
      }
      return { success: false, message: res.data.message || 'Failed' };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Could not add to cart',
      };
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    const res = await api.put(`/cart/items/${productId}`, { quantity });
    if (res.data.success) applyResponse(res.data);
  };

  const removeItem = async (productId: string) => {
    const res = await api.delete(`/cart/items/${productId}`);
    if (res.data.success) applyResponse(res.data);
  };

  const clearCart = async () => {
    const res = await api.delete('/cart');
    if (res.data.success) applyResponse(res.data);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        summary,
        loading,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
