export type PaymentMethod = 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet' | 'cash' | 'unknown';

export type TransactionType = 'credit' | 'debit';

export type Transaction = {
  id?: number;
  date: string;
  amount: number;
  type: string;
  paymentMethod: PaymentMethod;
  account?: string | null;
  bank?: string | null;
  category?: string | null;
  notes?: string | null;
  source_sms?: string | null;
  recipient?: string | null;
  created_at?: string;
};

export interface Message {
  id: number;
  message: string;
  date: string;
  type?: string;
  sender?: string;
  created_at?: string;
}

export const extractSenderOrRecipient = (smsText: string, type: TransactionType): string | null => {
  const text = smsText.toLowerCase();
  let recipient: string | null = null;

  if (type === 'credit') {
    // For credits, look for sender
    const senderMatch = text.match(/from\s+([a-z\s]+)/i);
    if (senderMatch) {
      recipient = senderMatch[1].trim().toUpperCase();
      console.log('Extracted sender for credit:', recipient);
    } else {
      console.log('No sender/recipient found in SMS');
    }
  } else {
    // For debits, look for recipient
    const recipientMatch = text.match(/to\s+([a-z\s]+)/i);
    if (recipientMatch) {
      recipient = recipientMatch[1].trim().toUpperCase();
    } else {
      // Try to extract name from capitalized words
      const words = text.split(/\s+/);
      const capitalizedWords = words.filter(word => /^[A-Z]/.test(word));
      if (capitalizedWords.length > 0) {
        recipient = capitalizedWords[0];
        console.log('Extracted name from capitalized words:', recipient);
      }
    }
  }

  return recipient;
};

export type CreditCardBillStatus = 'unpaid' | 'partially_paid' | 'fully_paid';

export interface CreditCardBill {
  id?: number;
  cardNumber: string;
  bankName: string;
  billPeriod: string;
  totalAmount: number;
  minimumDue: number;
  dueDate: string;
  statementDate: string;
  status: CreditCardBillStatus;
  paidAmount: number;
  remainingAmount: number;
  sourceSms: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardPayment {
  id?: number;
  cardNumber: string;
  bankName: string;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  sourceSms: string;
  matchedBillId?: number;
  createdAt: string;
} 