import { getDBConnection, executeQuery, insertRecord, checkDuplicate } from './database';
// Inline types if not available
type TransactionType = 'credit' | 'debit';
type PaymentMethod = 'upi' | 'card' | 'bank_transfer' | 'cash' | 'unknown';
type Transaction = {
  amount: number;
  date: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  recipient?: string | null;
  source_sms?: string;
};
import SmsAndroid from 'react-native-get-sms-android';
import { billService, Bill } from './BillService';

type SMS = {
  body: string;
  date: number;
  address: string;
};

export const syncBillPaymentSMS = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        sort: true,
      }),
      (fail: any) => {
        console.error('Failed to get SMS:', fail);
        resolve(false);
      },
      async (count: number, smsList: string) => {
        try {
          const smsArray = JSON.parse(smsList);
          let transactionCount = 0;
          let billCount = 0;

          for (const sms of smsArray) {
            try {
              const transaction = parseBillPaymentSMS(sms);
              if (transaction) {
                console.log(`Transaction: ${transaction.type} ${transaction.amount} ${transaction.paymentMethod} ${transaction.recipient || 'unknown'}`);
                
                // Check for duplicate transaction
                const isDuplicate = await checkDuplicate('transactions', {
                  amount: transaction.amount,
                  date: transaction.date,
                  type: transaction.type,
                  paymentMethod: transaction.paymentMethod,
                  recipient: transaction.recipient
                });

                if (isDuplicate) {
                  console.log('Skipping duplicate transaction');
                  continue;
                }

                // Insert transaction
                const db = await getDBConnection();
                const transactionId = await insertRecord(db, 'transactions', {
                  ...transaction,
                  createdAt: new Date().toISOString()
                });

                if (transactionId > 0) {
                  transactionCount++;
                  console.log(`Added transaction: ${transaction.type} ${transaction.amount} ${transaction.paymentMethod} ${transaction.recipient || 'unknown'}`);
                  // Also add as Bill to BillService if not duplicate
                  // Check for duplicate bill by amount, dueDate, and recipient
                  const dueDate = new Date(transaction.date);
                  const bills = await billService.getBills();
                  const billExists = bills.some(bill =>
                    bill.amount === transaction.amount &&
                    bill.dueDate.getTime() === dueDate.getTime() &&
                    bill.name === (transaction.recipient || 'Bill')
                  );
                  if (!billExists) {
                    const newBill: Omit<Bill, 'id'> = {
                      name: transaction.recipient || 'Bill',
                      amount: transaction.amount,
                      dueDate,
                      isRecurring: false,
                      category: 'Utilities',
                      isPaid: false,
                    };
                    await billService.addBill(newBill);
                    billCount++;
                  }
                }
              }
            } catch (error) {
              console.error('Error processing SMS:', error);
            }
          }

          console.log(`Sync completed. Added ${transactionCount} transactions, ${billCount} bills`);
          resolve(true);
        } catch (error) {
          console.error('SMS sync error:', error);
          resolve(false);
        }
      }
    );
  });
};

const parseBillPaymentSMS = (sms: SMS): Transaction | null => {
  const smsText = sms.body.toLowerCase();
  console.log('SMS Text:', smsText);

  // Check if it's a bill payment SMS
  if (!smsText.includes('bill') && !smsText.includes('payment')) {
    return null;
  }

  // Extract amount
  const amountMatch = smsText.match(/rs\.?\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) {
    console.log('No amount found in SMS');
    return null;
  }
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) {
    console.log('Invalid amount found in SMS');
    return null;
  }

  // Extract date
  const dateMatch = smsText.match(/(\d{1,2})[-/]([a-z]+)[-/](\d{2,4})/i);
  if (!dateMatch) {
    console.log('No date found in SMS');
    return null;
  }
  const [, day, month, year] = dateMatch;
  const monthIndex = getMonthIndex(month);
  const fullYear = year.length === 2 ? `20${year}` : year;
  const date = new Date(parseInt(fullYear), monthIndex, parseInt(day)).toISOString();

  // Extract payment method
  let paymentMethod: PaymentMethod = 'unknown';
  if (smsText.includes('upi')) {
    paymentMethod = 'upi';
  } else if (smsText.includes('card')) {
    paymentMethod = 'card';
  } else if (smsText.includes('neft') || smsText.includes('imps')) {
    paymentMethod = 'bank_transfer';
  }

  // Extract bill type/recipient
  let recipient: string | null = null;
  const billTypes = ['electricity', 'water', 'gas', 'mobile', 'internet', 'rent', 'insurance'];
  for (const type of billTypes) {
    if (smsText.includes(type)) {
      recipient = type.toUpperCase();
      break;
    }
  }

  if (!recipient) {
    // Try to extract name from capitalized words
    const words = smsText.split(/\s+/);
    const capitalizedWords = words.filter(word => /^[A-Z]/.test(word));
    if (capitalizedWords.length > 0) {
      recipient = capitalizedWords[0];
    }
  }

  return {
    amount,
    date,
    type: 'debit' as TransactionType,
    paymentMethod,
    recipient,
    source_sms: sms.body
  };
};

const getMonthIndex = (month: string): number => {
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const monthLower = month.toLowerCase();
  return months.findIndex(m => monthLower.startsWith(m));
}; 