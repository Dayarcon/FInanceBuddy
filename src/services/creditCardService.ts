import { getDBConnection, executeQuery, insertRecord, updateRecord, checkDuplicate } from './database';

// Types
export type CreditCardBillStatus = 'unpaid' | 'partially_paid' | 'fully_paid';

export interface CreditCardBill {
  id?: number;
  cardNumber: string; // Last 4 digits
  bankName: string;
  billPeriod: string; // e.g., "JUN-25"
  totalAmount: number;
  minimumDue: number;
  dueDate: string; // ISO date string
  statementDate: string; // ISO date string
  status: CreditCardBillStatus;
  paidAmount: number;
  remainingAmount: number;
  sourceSms: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardPayment {
  id?: number;
  cardNumber: string; // Last 4 digits
  bankName: string;
  paymentAmount: number;
  paymentDate: string; // ISO date string
  paymentMethod: string; // UPI, NEFT, etc.
  transactionId?: string;
  sourceSms: string;
  matchedBillId?: number;
  createdAt: string;
}

// Database Schema
export const createCreditCardTables = (db: any) => {
  try {
    // Credit Card Bills table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS credit_card_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cardNumber TEXT NOT NULL,
        bankName TEXT NOT NULL,
        billPeriod TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        minimumDue REAL NOT NULL,
        dueDate TEXT NOT NULL,
        statementDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unpaid',
        paidAmount REAL NOT NULL DEFAULT 0,
        remainingAmount REAL NOT NULL,
        sourceSms TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE(cardNumber, billPeriod)
      )
    `);

    // Credit Card Payments table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS credit_card_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cardNumber TEXT NOT NULL,
        bankName TEXT NOT NULL,
        paymentAmount REAL NOT NULL,
        paymentDate TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        transactionId TEXT,
        sourceSms TEXT NOT NULL,
        matchedBillId INTEGER,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (matchedBillId) REFERENCES credit_card_bills (id)
      )
    `);

    console.log('Credit card tables created successfully');
  } catch (error) {
    console.error('Error creating credit card tables:', error);
    throw error;
  }
};

// Parse Credit Card Bill from SMS
export const parseCreditCardBill = (sms: string): CreditCardBill | null => {
  try {
    const smsText = sms.toLowerCase();
    
    // Pattern 1: YES BANK format
    // "YES BANK Credit Card XX1606 JUN-25 statement: Total due INR 5561.82 Min due INR 278.09 Due by 02-JUL-2025"
    const yesBankPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+([A-Z]+-\d{2})\s+statement:\s*Total\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Min\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Due\s+by\s+(\d{2}-[A-Z]+-\d{4})/i;
    
    let match = sms.match(yesBankPattern);
    if (match) {
      const [, bankName, cardNumber, billPeriod, totalAmountStr, minDueStr, dueDateStr] = match;
      return createBillFromMatch(bankName, cardNumber, billPeriod, totalAmountStr, minDueStr, dueDateStr, sms);
    }

    // Pattern 2: ICICI Bank email format
    // "ICICI Bank Credit Card XX5009 statement is sent to ...@gmail.com total of rs 4,669.69 or minimum of Rs 240.00 is due by 03-Jun-25"
    const iciciEmailPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+statement\s+is\s+sent\s+to\s+[^@]+@[^\s]+\s+total\s+of\s+(?:rs|inr)\s*([\d,]+\.?\d*)\s+or\s+minimum\s+of\s+(?:rs|inr)\s*([\d,]+\.?\d*)\s+is\s+due\s+by\s+(\d{2}-[A-Z]+-\d{2,4})/i;
    
    match = sms.match(iciciEmailPattern);
    if (match) {
      const [, bankName, cardNumber, totalAmountStr, minDueStr, dueDateStr] = match;
      const billPeriod = extractBillPeriod(sms) || getCurrentBillPeriod();
      return createBillFromMatch(bankName, cardNumber, billPeriod, totalAmountStr, minDueStr, dueDateStr, sms);
    }

    // Pattern 3: HDFC Bank format
    // "HDFC Bank Credit Card XX5678 JUN-25 statement: Total due Rs 3200.50 Min due Rs 320.05 Due by 10-JUL-2025"
    const hdfcPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+([A-Z]+-\d{2})\s+statement:\s*Total\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Min\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Due\s+by\s+(\d{2}-[A-Z]+-\d{4})/i;
    
    match = sms.match(hdfcPattern);
    if (match) {
      const [, bankName, cardNumber, billPeriod, totalAmountStr, minDueStr, dueDateStr] = match;
      return createBillFromMatch(bankName, cardNumber, billPeriod, totalAmountStr, minDueStr, dueDateStr, sms);
    }

    // Pattern 4: Generic format
    const genericPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+).*?(?:Total\s+due|total\s+due)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:Min\s+due|min\s+due)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:Due\s+by|due\s+by)\s+(\d{2}-[A-Z]+-\d{2,4})/i;
    
    match = sms.match(genericPattern);
    if (match) {
      const [, bankName, cardNumber, totalAmountStr, minDueStr, dueDateStr] = match;
      const billPeriod = extractBillPeriod(sms) || getCurrentBillPeriod();
      return createBillFromMatch(bankName, cardNumber, billPeriod, totalAmountStr, minDueStr, dueDateStr, sms);
    }

    return null;
  } catch (error) {
    console.error('Error parsing credit card bill:', error);
    return null;
  }
};

// Parse Credit Card Payment from SMS
export const parseCreditCardPayment = (sms: string): CreditCardPayment | null => {
  try {
    const smsText = sms.toLowerCase();
    
    // Pattern 1: Bharat Bill Payment System
    // "Payment received of Rs 4,699.69 has been received on your ICICI Bank Credit Card XX5009 through Bharat Bill Payment System on 02-Jun-25"
    const bbpsPattern = /payment\s+received\s+of\s+(?:rs|inr)?\s*([\d,]+\.?\d*)\s+has\s+been\s+received\s+on\s+your\s+([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card|Account)\s+([A-Z0-9]+)\s+through\s+([A-Z\s]+)\s+on\s+(\d{2}-[A-Z]+-\d{2,4})/i;
    
    let match = sms.match(bbpsPattern);
    if (match) {
      const [, paymentAmountStr, bankName, cardNumber, paymentSystem, paymentDateStr] = match;
      return createPaymentFromMatch(bankName, cardNumber, paymentAmountStr, paymentDateStr, paymentSystem, sms);
    }

    // Pattern 2: UPI Payment
    // "UPI of Rs 2,500 has been credited to your HDFC Bank Credit Card XX1234"
    const upiPattern = /(?:upi|payment)\s+(?:of\s+)?(?:rs|inr)?\s*([\d,]+\.?\d*)\s+(?:has\s+been\s+)?(?:received|credited|paid)\s+(?:to\s+your\s+)?([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card|Account)\s+([A-Z0-9]+)/i;
    
    match = sms.match(upiPattern);
    if (match) {
      const [, paymentAmountStr, bankName, cardNumber] = match;
      const paymentDate = new Date().toISOString();
      return createPaymentFromMatch(bankName, cardNumber, paymentAmountStr, paymentDate, 'UPI', sms);
    }

    // Pattern 3: General Payment
    // "Payment of Rs 1,200 has been received on your SBI Credit Card XX5678"
    const generalPattern = /(?:payment|bill)\s+(?:of\s+)?(?:rs|inr)?\s*([\d,]+\.?\d*)\s+(?:has\s+been\s+)?(?:received|credited|paid)\s+(?:on\s+your\s+)?([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card|Account)\s+([A-Z0-9]+)/i;
    
    match = sms.match(generalPattern);
    if (match) {
      const [, paymentAmountStr, bankName, cardNumber] = match;
      const paymentDate = new Date().toISOString();
      return createPaymentFromMatch(bankName, cardNumber, paymentAmountStr, paymentDate, 'General', sms);
    }

    return null;
  } catch (error) {
    console.error('Error parsing credit card payment:', error);
    return null;
  }
};

// Insert Credit Card Bill
export const insertCreditCardBill = async (bill: CreditCardBill): Promise<number> => {
  try {
    // Check for duplicate bill
    const isDuplicate = await checkDuplicate('credit_card_bills', {
      cardNumber: bill.cardNumber,
      billPeriod: bill.billPeriod
    });

    if (isDuplicate) {
      console.log('Duplicate bill found, skipping insertion');
      return 0;
    }

    return await insertRecord('credit_card_bills', bill);
  } catch (error) {
    console.error('Error inserting credit card bill:', error);
    throw error;
  }
};

// Insert Credit Card Payment
export const insertCreditCardPayment = async (payment: CreditCardPayment): Promise<number> => {
  try {
    // Check for duplicate payment
    const isDuplicate = await checkDuplicate('credit_card_payments', {
      cardNumber: payment.cardNumber,
      paymentAmount: payment.paymentAmount,
      paymentDate: payment.paymentDate
    });

    if (isDuplicate) {
      console.log('Duplicate payment found, skipping insertion');
      return 0;
    }

    return await insertRecord('credit_card_payments', payment);
  } catch (error) {
    console.error('Error inserting credit card payment:', error);
    throw error;
  }
};

// Get unpaid bills by card number
export const getUnpaidBillsByCard = async (cardNumber: string): Promise<CreditCardBill[]> => {
  try {
    const query = `
      SELECT * FROM credit_card_bills 
      WHERE cardNumber = ? AND status != 'paid'
      ORDER BY dueDate ASC
    `;
    return await executeQuery(query, [cardNumber]);
  } catch (error) {
    console.error('Error getting unpaid bills:', error);
    throw error;
  }
};

// Update bill status and paid amount
export const updateBillStatus = async (billId: number, status: string, paidAmount: number, remainingAmount: number): Promise<void> => {
  try {
    await updateRecord('credit_card_bills', billId, {
      status,
      paidAmount,
      remainingAmount,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating bill status:', error);
    throw error;
  }
};

// Match payments to bills
export const matchPaymentsToBills = async (): Promise<number> => {
  try {
    // Get all unmatched payments
    const query = `
      SELECT * FROM credit_card_payments 
      WHERE matchedBillId IS NULL
      ORDER BY paymentDate ASC
    `;
    const payments = await executeQuery(query);

    let matchCount = 0;

    for (const payment of payments) {
      // Get unpaid bills for this card
      const bills = await getUnpaidBillsByCard(payment.cardNumber);
      
      if (bills.length === 0) continue;

      // Find the best matching bill
      let bestMatch = null;
      let bestScore = -1;

      for (const bill of bills) {
        const score = calculateMatchScore(payment, bill);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = bill;
        }
      }

      if (bestMatch && bestScore > 0.5) {
        // Update payment with matched bill
        await updateRecord('credit_card_payments', payment.id, {
          matchedBillId: bestMatch.id
        });

        // Update bill status
        const newPaidAmount = bestMatch.paidAmount + payment.paymentAmount;
        const newRemainingAmount = bestMatch.totalAmount - newPaidAmount;
        const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

        await updateBillStatus(
          bestMatch.id,
          newStatus,
          newPaidAmount,
          newRemainingAmount
        );

        matchCount++;
      }
    }

    return matchCount;
  } catch (error) {
    console.error('Error matching payments to bills:', error);
    throw error;
  }
};

// Calculate match score between payment and bill
const calculateMatchScore = (payment: CreditCardPayment, bill: CreditCardBill): number => {
  let score = 0;
  
  // Amount match (exact match gets highest score)
  if (payment.paymentAmount === bill.totalAmount) {
    score += 0.5;
  } else if (payment.paymentAmount === bill.minimumDue) {
    score += 0.3;
  } else if (payment.paymentAmount > bill.minimumDue && payment.paymentAmount < bill.totalAmount) {
    score += 0.2;
  }

  // Date proximity (payment should be close to due date)
  const paymentDate = new Date(payment.paymentDate);
  const dueDate = new Date(bill.dueDate);
  const daysDiff = Math.abs((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 3) {
    score += 0.3;
  } else if (daysDiff <= 7) {
    score += 0.2;
  } else if (daysDiff <= 15) {
    score += 0.1;
  }

  return score;
};

// Helper functions
const createBillFromMatch = (
  bankName: string, 
  cardNumber: string, 
  billPeriod: string, 
  totalAmountStr: string, 
  minDueStr: string, 
  dueDateStr: string, 
  sourceSms: string
): CreditCardBill => {
  const totalAmount = parseFloat(totalAmountStr.replace(/,/g, ''));
  const minimumDue = parseFloat(minDueStr.replace(/,/g, ''));
  const dueDate = convertDateToISO(dueDateStr);
  const now = new Date().toISOString();
  
  return {
    cardNumber: cardNumber.slice(-4), // Last 4 digits
    bankName: bankName.trim(),
    billPeriod,
    totalAmount,
    minimumDue,
    dueDate,
    statementDate: now,
    status: 'unpaid',
    paidAmount: 0,
    remainingAmount: totalAmount,
    sourceSms,
    createdAt: now,
    updatedAt: now
  };
};

const createPaymentFromMatch = (
  bankName: string, 
  cardNumber: string, 
  paymentAmountStr: string, 
  paymentDateStr: string, 
  paymentMethod: string, 
  sourceSms: string
): CreditCardPayment => {
  const paymentAmount = parseFloat(paymentAmountStr.replace(/,/g, ''));
  const paymentDate = convertDateToISO(paymentDateStr);
  const now = new Date().toISOString();
  
  return {
    cardNumber: cardNumber.slice(-4), // Last 4 digits
    bankName: bankName.trim(),
    paymentAmount,
    paymentDate,
    paymentMethod: paymentMethod.trim(),
    sourceSms,
    createdAt: now
  };
};

const convertDateToISO = (dateStr: string): string => {
  try {
    const formats = [
      /(\d{2})-([A-Za-z]+)-(\d{4})/, // 02-JUL-2025
      /(\d{2})-([A-Za-z]+)-(\d{2})/, // 02-JUL-25
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, day, month, year] = match;
        const monthIndex = getMonthIndex(month);
        const fullYear = year.length === 2 ? `20${year}` : year;
        
        const date = new Date(parseInt(fullYear), monthIndex, parseInt(day));
        return date.toISOString();
      }
    }
    
    return new Date().toISOString();
  } catch (error) {
    console.error('Error converting date:', error);
    return new Date().toISOString();
  }
};

const getMonthIndex = (month: string): number => {
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const monthLower = month.toLowerCase();
  return months.findIndex(m => monthLower.startsWith(m));
};

const extractBillPeriod = (sms: string): string | null => {
  const match = sms.match(/([A-Z]+-\d{2})/);
  return match ? match[1] : null;
};

const getCurrentBillPeriod = (): string => {
  const now = new Date();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear().toString().slice(-2);
  return `${month}-${year}`;
};

// Get all credit card bills
export const getAllCreditCardBills = async (): Promise<CreditCardBill[]> => {
  try {
    return await executeQuery('SELECT * FROM credit_card_bills ORDER BY dueDate DESC');
  } catch (error) {
    console.error('Error getting all credit card bills:', error);
    throw error;
  }
};

// Get all credit card payments
export const getAllCreditCardPayments = async (): Promise<CreditCardPayment[]> => {
  try {
    return await executeQuery('SELECT * FROM credit_card_payments ORDER BY paymentDate DESC');
  } catch (error) {
    console.error('Error getting all credit card payments:', error);
    throw error;
  }
}; 