import { getDBConnection, executeQuery, insertRecord, checkDuplicate } from './database';
import { Transaction, TransactionType, PaymentMethod } from '../types/transaction';
import { SmsAndroid } from 'react-native-get-sms-android';

type SMS = {
  body: string;
  date: number;
  address: string;
};

export const syncTransactionSMS = async (): Promise<{ success: boolean; count: number; error?: string }> => {
  return new Promise((resolve) => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        sort: true,
      }),
      (fail: any) => {
        console.error('Failed to get SMS:', fail);
        resolve({ success: false, count: 0, error: 'Failed to get SMS' });
      },
      async (count: number, smsList: string) => {
        try {
          const smsArray = JSON.parse(smsList);
          let transactionCount = 0;

          for (const sms of smsArray) {
            try {
              const transaction = parseTransactionSMS(sms);
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
                }
              }
            } catch (error) {
              console.error('Error processing SMS:', error);
            }
          }

          console.log(`Sync completed. Added ${transactionCount} transactions`);
          resolve({ success: true, count: transactionCount });
        } catch (error) {
          console.error('Transaction SMS sync error:', error);
          resolve({ success: false, count: 0, error: 'Database error' });
        }
      }
    );
  });
};

const parseTransactionSMS = (sms: SMS): Transaction | null => {
  const smsText = sms.body.toLowerCase();
  console.log('SMS Text:', smsText);

  // Check for credit/debit indicators
  const hasDebit = smsText.includes('debited') || smsText.includes('spent') || smsText.includes('paid');
  const hasCredit = smsText.includes('credited') || smsText.includes('received');
  
  console.log('Contains \'debited\':', hasDebit);
  console.log('Contains \'credited\':', hasCredit);

  let type: TransactionType;
  if (hasCredit) {
    console.log('Setting type to CREDIT based on credit indicators');
    type = 'credit';
  } else if (hasDebit) {
    console.log('Setting type to DEBIT based on debit indicators');
    type = 'debit';
  } else {
    console.log('No clear transaction type found, defaulting to DEBIT');
    type = 'debit';
  }
  console.log('Final transaction type:', type);

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

  // Extract recipient/sender
  let recipient: string | null = null;
  if (type === 'credit') {
    // For credits, look for sender
    const senderMatch = smsText.match(/from\s+([a-z\s]+)/i);
    if (senderMatch) {
      recipient = senderMatch[1].trim().toUpperCase();
      console.log('Extracted sender for credit:', recipient);
    } else {
      console.log('No sender/recipient found in SMS');
    }
  } else {
    // For debits, look for recipient
    const recipientMatch = smsText.match(/to\s+([a-z\s]+)/i);
    if (recipientMatch) {
      recipient = recipientMatch[1].trim().toUpperCase();
    } else {
      // Try to extract name from capitalized words
      const words = smsText.split(/\s+/);
      const capitalizedWords = words.filter(word => /^[A-Z]/.test(word));
      if (capitalizedWords.length > 0) {
        recipient = capitalizedWords[0];
        console.log('Extracted name from capitalized words:', recipient);
      }
    }
  }

  return {
    amount,
    date,
    type,
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