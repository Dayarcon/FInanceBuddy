import { getDBConnection, executeQuery, insertRecord, checkDuplicate } from './database';
import { Transaction, PaymentMethod, TransactionType, extractSenderOrRecipient } from './types';
import SmsAndroid from 'react-native-get-sms-android';
import { MessageParserService } from './MessageParserService';

type SMS = {
  body: string;
  date: number;
  address: string;
};

const messageParser = new MessageParserService();

export const syncSmsTransactions = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
  return new Promise((resolve) => {
    SmsAndroid.list(
      JSON.stringify({
        box: 'inbox',
        sort: true,
      }),
      (fail: any) => {
        console.error('Failed to get SMS:', fail);
        resolve({ success: false, error: 'Failed to get SMS' });
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
                  recipient: transaction.recipient || null
                });

                if (isDuplicate) {
                  console.log('Skipping duplicate transaction');
                  continue;
                }

                // Create a plain object with only serializable data
                const transactionData = {
                  amount: Number(transaction.amount),
                  date: String(transaction.date),
                  type: String(transaction.type),
                  paymentMethod: String(transaction.paymentMethod),
                  account: transaction.account ? String(transaction.account) : null,
                  bank: transaction.bank ? String(transaction.bank) : null,
                  recipient: transaction.recipient ? String(transaction.recipient) : null,
                  source_sms: String(transaction.source_sms),
                  created_at: new Date().toISOString()
                };

                // Insert transaction
                const db = await getDBConnection();
                const transactionId = await insertRecord(db, 'transactions', transactionData);

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
          console.error('SMS sync error:', error);
          resolve({ success: false, error: 'Failed to sync SMS transactions' });
        }
      }
    );
  });
};

const parseTransactionSMS = (sms: SMS): Transaction | null => {
  const smsText = sms.body.toLowerCase();
  
  // Extract bank name first
  const bankName = messageParser.extractBankName(sms.body);
  
  // Improved transaction type detection
  let type: TransactionType;
  
  // Check for UPI transactions first
  if (smsText.includes('upi')) {
    // For UPI transactions, check specific patterns
    if (smsText.includes('debited') && smsText.includes('credited')) {
      // If it's a UPI transaction with both debited and credited
      const debitedIndex = smsText.indexOf('debited');
      const creditedIndex = smsText.indexOf('credited');
      type = debitedIndex < creditedIndex ? 'debit' : 'credit';
    } else if (smsText.includes('debited')) {
      type = 'debit';
    } else if (smsText.includes('credited')) {
      type = 'credit';
    } else if (smsText.includes('paid to') || smsText.includes('sent to')) {
      type = 'debit';
    } else if (smsText.includes('received from') || smsText.includes('received by')) {
      type = 'credit';
    } else {
      // Default to debit for UPI transactions if no clear indication
      type = 'debit';
    }
  } else {
    // For non-UPI transactions
    if (smsText.includes('debited')) {
      type = 'debit';
    } else if (smsText.includes('credited') || smsText.includes('received')) {
      type = 'credit';
    } else {
      return null;
    }
  }

  // Extract amount
  const amountMatch = smsText.match(/rs\.?\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Extract date
  const dateMatch = smsText.match(/(\d{1,2})[-/]([a-z]+)[-/](\d{2,4})/i);
  if (!dateMatch) return null;
  const [, day, month, year] = dateMatch;
  const monthIndex = getMonthIndex(month);
  const fullYear = year.length === 2 ? `20${year}` : year;
  const date = new Date(parseInt(fullYear), monthIndex, parseInt(day)).toISOString();

  // Extract payment method
  let paymentMethod: PaymentMethod = 'unknown';
  if (smsText.includes('upi')) paymentMethod = 'upi';
  else if (smsText.includes('credit card')) paymentMethod = 'credit_card';
  else if (smsText.includes('debit card')) paymentMethod = 'debit_card';
  else if (smsText.includes('neft') || smsText.includes('imps')) paymentMethod = 'net_banking';
  else if (smsText.includes('wallet')) paymentMethod = 'wallet';
  else if (smsText.includes('cash')) paymentMethod = 'cash';

  // Extract recipient/sender with improved patterns
  let recipient: string | null = null;
  
  if (type === 'credit') {
    const senderPatterns = [
      /from\s+([A-Z\s]+)/i, // General pattern for names in all caps
      /from\s+([a-z\s]+(?:bank|ltd|limited))/i,
      /received\s+from\s+([a-z\s]+)/i,
      /credited\s+by\s+([a-z\s]+)/i,
      /sender\s*:\s*([a-z\s]+)/i
    ];
    
    for (const pattern of senderPatterns) {
      const match = sms.body.match(pattern);
      if (match && match[1]) {
        recipient = match[1].trim().toUpperCase();
        break;
      }
    }
  } else {
    // For debit transactions, check ICICI Bank specific pattern first
    const iciciDebitPattern = /debited[^;]+;\s*([a-z\s]+)\s+credited/i;
    const iciciMatch = sms.body.match(iciciDebitPattern);
    if (iciciMatch) {
      recipient = iciciMatch[1].trim().toUpperCase();
    } else {
      // Fallback to other patterns
      const recipientPatterns = [
        /to\s+([a-z\s]+(?:bank|ltd|limited))/i,
        /paid\s+to\s+([a-z\s]+)/i,
        /sent\s+to\s+([a-z\s]+)/i,
        /recipient\s*:\s*([a-z\s]+)/i
      ];
      
      for (const pattern of recipientPatterns) {
        const match = sms.body.match(pattern);
        if (match && match[1]) {
          recipient = match[1].trim().toUpperCase();
          break;
        }
      }
    }
  }

  // If no recipient found, try to extract from capitalized words
  if (!recipient) {
    const words = sms.body.split(/\s+/);
    const capitalizedWords = words.filter(word => /^[A-Z]/.test(word) && word.length > 2);
    if (capitalizedWords.length > 0) {
      // Skip common words like "ICICI", "BANK", "ACCT", "UPI", etc.
      const skipWords = ['ICICI', 'BANK', 'ACCT', 'UPI', 'CALL', 'SMS', 'BLOCK', 'DEAR', 'CUSTOMER'];
      const filteredWords = capitalizedWords.filter(word => !skipWords.includes(word));
      if (filteredWords.length > 0) {
        recipient = filteredWords[0];
      }
    }
  }

  return {
    amount,
    date,
    type,
    paymentMethod,
    bank: bankName,
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
