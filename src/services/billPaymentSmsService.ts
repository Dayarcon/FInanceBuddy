import { getDBConnection, executeQuery, insertRecord, checkDuplicate } from './database';
import { Transaction, TransactionType, PaymentMethod } from '../types/transaction';
import { SmsAndroid } from 'react-native-get-sms-android';

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
                const transactionId = await insertRecord('transactions', {
                  ...transaction,
                  createdAt: new Date().toISOString()
                });

                if (transactionId > 0) {
                  transactionCount++;
                  console.log(`Added transaction: ${transaction.type} ${transaction.amount} ${transaction.paymentMethod} ${transaction.recipient || 'unknown'}`);
                }
              }
            } catch (error) {
              console.error('Error processing SMS:', error);
            }
          }

          console.log(`Sync completed. Added ${transactionCount} transactions`);
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