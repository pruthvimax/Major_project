export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  role: 'farmer' | 'buyer' | 'admin';
}

export interface Farmer extends User {
  role: 'farmer';
  farmName?: string;
  farmSize?: number;
  products?: string[];
}

export interface Buyer extends User {
  role: 'buyer';
  preferences?: string[];
  orders?: string[];
}

export interface Admin extends User {
  role: 'admin';
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  mobile: string;
  address: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: 'farmer' | 'buyer' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData, role: 'farmer' | 'buyer') => Promise<void>;
}