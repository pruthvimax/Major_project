export type LanguageCode = 'en' | 'hi' | 'kn' | 'ml';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export type TranslationKeys = {
  // Common
  common: {
    appName: string;
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    back: string;
    confirm: string;
    search: string;
    filter: string;
    clear: string;
    all: string;
    logout: string;
    login: string;
    register: string;
    selectLanguage: string;
    language: string;
  };
  // Auth
  auth: {
    welcomeBack: string;
    signInSubtitle: string;
    createAccount: string;
    registerSubtitle: string;
    email: string;
    password: string;
    fullName: string;
    mobile: string;
    address: string;
    role: string;
    buyerRole: string;
    farmerRole: string;
    adminRole: string;
    loginBtn: string;
    registerBtn: string;
    dontHaveAccount: string;
    alreadyHaveAccount: string;
  };
  // Navigation & Headers
  nav: {
    dashboard: string;
    browse: string;
    cart: string;
    orders: string;
    products: string;
    users: string;
    analytics: string;
    disputes: string;
    settings: string;
    profile: string;
  };
  // Buyer Marketplace
  marketplace: {
    browseTitle: string;
    searchPlaceholder: string;
    categories: {
      all: string;
      vegetables: string;
      fruits: string;
      grains: string;
      dairy: string;
      organic: string;
    };
    stock: string;
    outOfStock: string;
    organic: string;
    byFarmer: string;
    addToCart: string;
    buyNow: string;
    noProducts: string;
    noProductsDesc: string;
  };
  // Cart & Checkout
  cart: {
    title: string;
    emptyCart: string;
    total: string;
    checkout: string;
    placeOrder: string;
    shippingAddress: string;
    paymentMethod: string;
    cashOnDelivery: string;
    onlinePayment: string;
  };
  // Orders
  orders: {
    title: string;
    orderNumber: string;
    status: string;
    pending: string;
    accepted: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    disputed: string;
    trackOrder: string;
    cancelOrder: string;
  };
  // Farmer
  farmer: {
    dashboardTitle: string;
    addProduct: string;
    myProducts: string;
    receivedOrders: string;
    totalSales: string;
    activeListings: string;
  };
  // Admin
  admin: {
    dashboardTitle: string;
    management: string;
    totalFarmers: string;
    totalBuyers: string;
    totalProducts: string;
    totalOrders: string;
    revenue: string;
  };
};
