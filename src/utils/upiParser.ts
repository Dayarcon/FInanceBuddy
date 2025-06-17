interface UPITransaction {
  amount: number;
  date: Date;
  time: string;
  vpa: string;
  refNo: string;
  bank: string;
  type: 'DEBIT' | 'CREDIT';
  paymentType: 'CREDIT_CARD_BILL' | 'NORMAL_PAYMENT';
  merchantName?: string;
}

// Common credit card bill payment VPAs
const CREDIT_CARD_VPAS = {
  'cred.club@axisb': 'Axis Bank Credit Card',
  'ccpay@hdfcbank': 'HDFC Bank Credit Card',
  'ccpay@icici': 'ICICI Bank Credit Card',
  'ccpay@kotak': 'Kotak Bank Credit Card',
  'ccpay@sbi': 'SBI Credit Card',
  'ccpay@idfc': 'IDFC Bank Credit Card',
  'ccpay@yesbank': 'Yes Bank Credit Card',
  'ccpay@citi': 'Citi Bank Credit Card',
  'ccpay@amex': 'American Express',
  'ccpay@hsbc': 'HSBC Bank Credit Card',
  'ccpay@rbl': 'RBL Bank Credit Card',
  'ccpay@standardchartered': 'Standard Chartered Credit Card',
};

// Common merchant VPAs for normal payments
const MERCHANT_VPAS = {
  'paytm': 'Paytm',
  'okbizaxis': 'Axis Bank UPI',
  'ybl': 'PhonePe',
  'apl': 'Amazon Pay',
  'gpay': 'Google Pay',
  'upi': 'UPI',
  'ptys': 'Paytm',
};

/**
 * Identifies if a transaction is a credit card bill payment
 * @param vpa The VPA from the transaction
 * @returns Object containing payment type and merchant name
 */
function identifyPaymentType(vpa: string): { paymentType: 'CREDIT_CARD_BILL' | 'NORMAL_PAYMENT', merchantName?: string } {
  // Check if it's a credit card payment
  for (const [ccVpa, bankName] of Object.entries(CREDIT_CARD_VPAS)) {
    if (vpa.toLowerCase().includes(ccVpa.toLowerCase())) {
      return { paymentType: 'CREDIT_CARD_BILL', merchantName: bankName };
    }
  }

  // Check if it's a known merchant
  for (const [merchantVpa, merchantName] of Object.entries(MERCHANT_VPAS)) {
    if (vpa.toLowerCase().includes(merchantVpa.toLowerCase())) {
      return { paymentType: 'NORMAL_PAYMENT', merchantName };
    }
  }

  // Default to normal payment if no specific pattern is found
  return { paymentType: 'NORMAL_PAYMENT' };
}

/**
 * Parses a UPI transaction message and extracts relevant information
 * @param message The SMS message containing UPI transaction details
 * @returns UPITransaction object or null if parsing fails
 */
export function parseUPIMessage(message: string): UPITransaction | null {
  try {
    // Extract amount
    const amountMatch = message.match(/Rs\s+([\d,.]+)/);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Extract date and time
    const dateTimeMatch = message.match(/(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2}:\d{2})/);
    if (!dateTimeMatch) return null;
    const [_, dateStr, timeStr] = dateTimeMatch;
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // Extract VPA
    const vpaMatch = message.match(/VPA\s+([^\s]+)/);
    if (!vpaMatch) return null;
    const vpa = vpaMatch[1];

    // Extract Reference Number
    const refNoMatch = message.match(/Ref No\s+(\d+)/);
    if (!refNoMatch) return null;
    const refNo = refNoMatch[1];

    // Extract Bank
    const bankMatch = message.match(/-([^-]+)$/);
    const bank = bankMatch ? bankMatch[1].trim() : 'Unknown Bank';

    // Determine transaction type
    const type = message.toLowerCase().includes('debited') ? 'DEBIT' : 'CREDIT';

    // Identify payment type and merchant
    const { paymentType, merchantName } = identifyPaymentType(vpa);

    return {
      amount,
      date,
      time: timeStr,
      vpa,
      refNo,
      bank,
      type,
      paymentType,
      merchantName
    };
  } catch (error) {
    console.error('Error parsing UPI message:', error);
    return null;
  }
}

/**
 * Parses multiple UPI transaction messages
 * @param messages Array of SMS messages containing UPI transaction details
 * @returns Array of parsed UPITransaction objects
 */
export function parseMultipleUPIMessages(messages: string[]): UPITransaction[] {
  return messages
    .map(message => parseUPIMessage(message))
    .filter((transaction): transaction is UPITransaction => transaction !== null);
}

/**
 * Formats a UPI transaction for display
 * @param transaction The UPI transaction to format
 * @returns Formatted string representation of the transaction
 */
export function formatUPITransaction(transaction: UPITransaction): string {
  const paymentTypeStr = transaction.paymentType === 'CREDIT_CARD_BILL' ? 'Credit Card Bill Payment' : 'Normal Payment';
  const merchantInfo = transaction.merchantName ? ` (${transaction.merchantName})` : '';
  
  return `${transaction.type === 'DEBIT' ? 'Debited' : 'Credited'} Rs ${transaction.amount.toFixed(2)} on ${transaction.date.toLocaleDateString()} ${transaction.time} to ${transaction.vpa}${merchantInfo} - ${paymentTypeStr} (Ref: ${transaction.refNo}) - ${transaction.bank}`;
}

/**
 * Groups transactions by payment type
 * @param transactions Array of UPI transactions
 * @returns Object containing grouped transactions
 */
export function groupTransactionsByType(transactions: UPITransaction[]): {
  creditCardPayments: UPITransaction[];
  normalPayments: UPITransaction[];
} {
  return transactions.reduce((acc, transaction) => {
    if (transaction.paymentType === 'CREDIT_CARD_BILL') {
      acc.creditCardPayments.push(transaction);
    } else {
      acc.normalPayments.push(transaction);
    }
    return acc;
  }, {
    creditCardPayments: [] as UPITransaction[],
    normalPayments: [] as UPITransaction[]
  });
} 