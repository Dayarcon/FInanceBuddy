import * as SQLite from 'expo-sqlite';
import { getDBConnection, executeQuery, insertRecord, updateRecord, checkDuplicate, createTables } from './database';
import { CreditCardBill, CreditCardPayment, CreditCardBillStatus } from './types';

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
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Check for duplicate bill
    const isDuplicate = await checkDuplicate('credit_card_bills', {
      cardNumber: bill.cardNumber,
      billPeriod: bill.billPeriod
    });

    if (isDuplicate) {
      console.log('Duplicate bill found, skipping insertion');
      return 0;
    }

    return await insertRecord(db, 'credit_card_bills', bill as unknown as Record<string, SQLite.SQLStatementArg>);
  } catch (error) {
    console.error('Error inserting credit card bill:', error);
    throw error;
  }
};

// Insert Credit Card Payment
export const insertCreditCardPayment = async (payment: CreditCardPayment): Promise<number> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

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

    return await insertRecord(db, 'credit_card_payments', payment as unknown as Record<string, SQLite.SQLStatementArg>);
  } catch (error) {
    console.error('Error inserting credit card payment:', error);
    throw error;
  }
};

// Get unpaid bills by card number
export const getUnpaidBillsByCard = async (cardNumber: string): Promise<CreditCardBill[]> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Ensure tables are created
    await createTables();

    const query = `
      SELECT * FROM credit_card_bills 
      WHERE cardNumber = ? AND status != 'fully_paid'
      ORDER BY dueDate ASC
    `;
    const results = await executeQuery(db, query, [cardNumber]);
    return results.map(item => ({
      id: Number(item.id),
      cardNumber: String(item.cardNumber),
      bankName: String(item.bankName),
      billPeriod: String(item.billPeriod),
      totalAmount: Number(item.totalAmount),
      minimumDue: Number(item.minimumDue),
      dueDate: String(item.dueDate),
      statementDate: String(item.statementDate),
      status: String(item.status) as CreditCardBillStatus,
      paidAmount: Number(item.paidAmount),
      remainingAmount: Number(item.remainingAmount),
      sourceSms: String(item.sourceSms),
      createdAt: String(item.createdAt),
      updatedAt: String(item.updatedAt)
    }));
  } catch (error) {
    console.error('Error getting unpaid bills:', error);
    throw error;
  }
};

// Update bill status and paid amount
export const updateBillStatus = async (billId: number, status: CreditCardBillStatus, paidAmount: number, remainingAmount: number): Promise<void> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Ensure tables are created
    await createTables();

    await updateRecord(db, 'credit_card_bills', billId, {
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
export const matchPaymentsToBills = async (cardNumber: string | null): Promise<void> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Ensure tables are created
    await createTables();

    // Get all unpaid bills
    const billsQuery = cardNumber 
      ? `SELECT * FROM credit_card_bills WHERE cardNumber = ? AND status != 'fully_paid' ORDER BY dueDate ASC`
      : `SELECT * FROM credit_card_bills WHERE status != 'fully_paid' ORDER BY dueDate ASC`;
    const bills = await executeQuery(db, billsQuery, cardNumber ? [cardNumber] : []);

    // Get all unmatched payments
    const paymentsQuery = cardNumber
      ? `SELECT * FROM credit_card_payments WHERE cardNumber = ? AND matchedBillId IS NULL ORDER BY paymentDate ASC`
      : `SELECT * FROM credit_card_payments WHERE matchedBillId IS NULL ORDER BY paymentDate ASC`;
    const payments = await executeQuery(db, paymentsQuery, cardNumber ? [cardNumber] : []);

    // Match payments to bills
    for (const payment of payments) {
      const paymentAmount = Number(payment.paymentAmount);
      let remainingPaymentAmount = paymentAmount;

      for (const bill of bills) {
        if (remainingPaymentAmount <= 0) break;

        const remainingBillAmount = Number(bill.remainingAmount);
        if (remainingBillAmount <= 0) continue;

        const amountToApply = Math.min(remainingPaymentAmount, remainingBillAmount);
        const newPaidAmount = Number(bill.paidAmount) + amountToApply;
        const newRemainingAmount = remainingBillAmount - amountToApply;
        const newStatus = newRemainingAmount <= 0 ? 'fully_paid' : 'partially_paid';

        // Update bill
        await updateRecord(db, 'credit_card_bills', Number(bill.id), {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });

        // Update payment with matched bill ID
        await updateRecord(db, 'credit_card_payments', Number(payment.id), {
          matchedBillId: Number(bill.id)
        });

        remainingPaymentAmount -= amountToApply;
      }
    }
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
    status: 'unpaid' as CreditCardBillStatus,
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
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }
    return await executeQuery(db, 'SELECT * FROM credit_card_bills ORDER BY dueDate DESC');
  } catch (error) {
    console.error('Error getting all credit card bills:', error);
    throw error;
  }
};

// Get all credit card payments
export const getAllCreditCardPayments = async (): Promise<CreditCardPayment[]> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }
    return await executeQuery(db, 'SELECT * FROM credit_card_payments ORDER BY paymentDate DESC');
  } catch (error) {
    console.error('Error getting all credit card payments:', error);
    throw error;
  }
};

// Check SMS for bill payments and update bill status
export const checkSmsForBillPayments = async (sms: string): Promise<void> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Parse the payment from SMS
    const payment = parseCreditCardPayment(sms);
    if (!payment) {
      return;
    }

    // Get all unpaid bills for this card
    const billsQuery = `
      SELECT * FROM credit_card_bills 
      WHERE cardNumber = ? 
      AND status != 'fully_paid' 
      ORDER BY dueDate ASC
    `;
    const bills = await executeQuery(db, billsQuery, [payment.cardNumber]);

    if (bills.length === 0) {
      console.log(`No unpaid bills found for card ${payment.cardNumber}`);
      return;
    }

    // Try to match payment with bills
    let remainingPaymentAmount = payment.paymentAmount;
    let paymentMatched = false;

    for (const bill of bills) {
      if (remainingPaymentAmount <= 0) break;

      const remainingBillAmount = Number(bill.remainingAmount);
      if (remainingBillAmount <= 0) continue;

      // Check if payment amount matches bill amount (exact or partial)
      if (payment.paymentAmount === bill.totalAmount || 
          payment.paymentAmount === bill.minimumDue ||
          (payment.paymentAmount > bill.minimumDue && payment.paymentAmount < bill.totalAmount)) {
        
        const amountToApply = Math.min(remainingPaymentAmount, remainingBillAmount);
        const newPaidAmount = Number(bill.paidAmount) + amountToApply;
        const newRemainingAmount = remainingBillAmount - amountToApply;
        const newStatus = newRemainingAmount <= 0 ? 'fully_paid' : 'partially_paid';

        // Update bill status
        await updateBillStatus(
          Number(bill.id),
          newStatus,
          newPaidAmount,
          newRemainingAmount
        );

        // Insert payment record
        await insertRecord(db, 'credit_card_payments', {
          ...payment,
          matchedBillId: Number(bill.id),
          createdAt: new Date().toISOString()
        });

        remainingPaymentAmount -= amountToApply;
        paymentMatched = true;
      }
    }

    if (paymentMatched) {
      console.log(`Successfully matched payment of ₹${payment.paymentAmount} for card ${payment.cardNumber}`);
    } else {
      console.log(`No matching bill found for payment of ₹${payment.paymentAmount} for card ${payment.cardNumber}`);
    }
  } catch (error) {
    console.error('Error checking SMS for bill payments:', error);
    throw error;
  }
};

// Parse UPI Transaction from SMS
export const parseUPITransaction = (sms: string): {
  amount: number;
  date: string;
  vpa: string;
  refNo: string;
  bank: string;
  type: 'debit' | 'credit';
} | null => {
  try {
    // Pattern for UPI debit messages
    // Example: "Rs 546.00 debited via UPI on 31-05-2025 21:08:59 to VPA paytmqr177zry6st7@paytm.Ref No 551731379635.Small txns?Use UPI Lite!-Federal Bank"
    const debitPattern = /Rs\s+([\d,]+\.?\d*)\s+debited\s+via\s+UPI\s+on\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})\s+to\s+VPA\s+([^\s]+)\.Ref\s+No\s+(\d+)\.([^-]+)-([A-Za-z\s]+)/i;
    
    // Pattern for UPI credit messages
    // Example: "Rs 1000.00 credited via UPI on 31-05-2025 21:08:59 from VPA paytmqr177zry6st7@paytm.Ref No 551731379635.Small txns?Use UPI Lite!-Federal Bank"
    const creditPattern = /Rs\s+([\d,]+\.?\d*)\s+credited\s+via\s+UPI\s+on\s+(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})\s+from\s+VPA\s+([^\s]+)\.Ref\s+No\s+(\d+)\.([^-]+)-([A-Za-z\s]+)/i;

    let match = sms.match(debitPattern);
    if (match) {
      const [, amountStr, dateStr, vpa, refNo, , bank] = match;
      return {
        amount: parseFloat(amountStr.replace(/,/g, '')),
        date: convertDateToISO(dateStr),
        vpa,
        refNo,
        bank: bank.trim(),
        type: 'debit'
      };
    }

    match = sms.match(creditPattern);
    if (match) {
      const [, amountStr, dateStr, vpa, refNo, , bank] = match;
      return {
        amount: parseFloat(amountStr.replace(/,/g, '')),
        date: convertDateToISO(dateStr),
        vpa,
        refNo,
        bank: bank.trim(),
        type: 'credit'
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing UPI transaction:', error);
    return null;
  }
};

// Process UPI transaction for credit card payment
export const processUPITransaction = async (sms: string): Promise<void> => {
  try {
    const db = getDBConnection();
    if (!db) {
      throw new Error('Failed to connect to database');
    }

    // Parse UPI transaction
    const upiTransaction = parseUPITransaction(sms);
    if (!upiTransaction) {
      return;
    }

    // For credit card payments, we'll check all banks since VPA might not indicate the target bank
    if (upiTransaction.type === 'debit') {
      // Get all unpaid bills from all banks
      const billsQuery = `
        SELECT * FROM credit_card_bills 
        WHERE status != 'fully_paid' 
        ORDER BY dueDate ASC
      `;
      const bills = await executeQuery(db, billsQuery, []);

      if (bills.length === 0) {
        console.log('No unpaid bills found');
        return;
      }

      // Try to match payment with bills
      let remainingPaymentAmount = upiTransaction.amount;
      let paymentMatched = false;

      for (const bill of bills) {
        if (remainingPaymentAmount <= 0) break;

        const remainingBillAmount = Number(bill.remainingAmount);
        if (remainingBillAmount <= 0) continue;

        // Check if payment amount matches bill amount (exact or partial)
        if (upiTransaction.amount === bill.totalAmount || 
            upiTransaction.amount === bill.minimumDue ||
            (upiTransaction.amount > bill.minimumDue && upiTransaction.amount < bill.totalAmount)) {
          
          const amountToApply = Math.min(remainingPaymentAmount, remainingBillAmount);
          const newPaidAmount = Number(bill.paidAmount) + amountToApply;
          const newRemainingAmount = remainingBillAmount - amountToApply;
          const newStatus = newRemainingAmount <= 0 ? 'fully_paid' : 'partially_paid';

          // Create payment object with the matched bill's bank
          const payment: CreditCardPayment = {
            cardNumber: bill.cardNumber,
            bankName: bill.bankName,
            paymentAmount: upiTransaction.amount,
            paymentDate: upiTransaction.date,
            paymentMethod: 'UPI',
            transactionId: upiTransaction.refNo,
            sourceSms: sms,
            matchedBillId: Number(bill.id),
            createdAt: new Date().toISOString()
          };

          // Update bill status
          await updateBillStatus(
            Number(bill.id),
            newStatus,
            newPaidAmount,
            newRemainingAmount
          );

          // Insert payment record
          await insertRecord(db, 'credit_card_payments', payment);

          remainingPaymentAmount -= amountToApply;
          paymentMatched = true;
          
          console.log(`Matched UPI payment of ₹${upiTransaction.amount} with ${bill.bankName} bill for card ${bill.cardNumber}`);
        }
      }

      if (!paymentMatched) {
        console.log(`No matching bill found for UPI payment of ₹${upiTransaction.amount}`);
      }
    }
  } catch (error) {
    console.error('Error processing UPI transaction:', error);
    throw error;
  }
}; 