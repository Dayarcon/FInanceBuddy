export type TransactionType = 'credit' | 'debit';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'cash' | 'card' | 'bank_transfer' | 'unknown';

export interface Transaction {
  id?: number;
  amount: number;
  date: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  account?: string;
  category?: string;
  notes?: string;
  source_sms?: string;
  recipient?: string;
  created_at?: string;
} 