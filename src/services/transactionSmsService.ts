import { getDBConnection, executeQuery, insertRecord, checkDuplicate } from './database';
import { Transaction, TransactionType, PaymentMethod } from '../types/transaction';
import SmsAndroid from 'react-native-get-sms-android';
import { enhancedAISmsService } from './EnhancedAISmsService';

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

          console.log(`🤖 AI Processing ${smsArray.length} transaction SMS messages...`);

          for (const sms of smsArray) {
            try {
              // Use AI processing instead of basic parsing
              const aiResult = await enhancedAISmsService.processSingleSMSWithAI(sms);
              
              if (aiResult.transaction) {
                console.log(`🤖 AI Transaction: ${aiResult.transaction.type} Rs.${aiResult.transaction.amount} ${aiResult.category} (${(aiResult.confidence * 100).toFixed(1)}% confidence)`);
                transactionCount++;
              } else {
                // Fallback to basic parsing if AI fails
                const transaction = parseTransactionSMS(sms);
                if (transaction) {
                  console.log(`📱 Basic Transaction: ${transaction.type} Rs.${transaction.amount} to/from ${transaction.recipient}`);

                  const isDuplicate = await checkDuplicate('transactions', {
                    amount: transaction.amount,
                    date: transaction.date,
                    type: transaction.type,
                    paymentMethod: transaction.paymentMethod,
                    recipient: transaction.recipient
                  });

                  if (isDuplicate) {
                    console.log('Duplicate transaction skipped.');
                    continue;
                  }

                  const db = await getDBConnection();
                  const transactionId = await insertRecord(db, 'transactions', {
                    ...transaction,
                    confidence: 0.5, // Basic parsing confidence
                    ai_features: JSON.stringify({ method: 'basic_parsing' }),
                    enhanced_category: 'basic_parsed',
                    processing_time: 0,
                    created_at: new Date().toISOString()
                  });

                  if (transactionId > 0) {
                    transactionCount++;
                  }
                }
              }
            } catch (error) {
              console.error('Error processing SMS:', error);
            }
          }

          // Get AI processing statistics
          const stats = enhancedAISmsService.getStats();
          
          console.log(`🤖 AI Transaction Sync completed. Added ${transactionCount} transactions`);
          console.log(`📊 AI Stats: ${stats.successful} AI processed, ${stats.failed} failed, ${(stats.averageConfidence * 100).toFixed(1)}% avg confidence`);

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
  console.log('Parsing SMS:', smsText);

  // Extract bank name
  let bankName = 'Unknown Bank';
  const commonBanks = [
    // Public Sector Banks
    'State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
    'Indian Bank', 'Bank of India', 'Central Bank of India', 'Indian Overseas Bank', 'UCO Bank',
    'Bank of Maharashtra', 'Punjab & Sind Bank',
  
    // Private Sector Banks
    'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank', 'Yes Bank',
    'Federal Bank', 'IDFC FIRST Bank', 'South Indian Bank', 'Karur Vysya Bank', 'City Union Bank',
    'RBL Bank', 'Bandhan Bank', 'DCB Bank', 'CSB Bank',
  
    // Foreign Banks
    'Citibank', 'HSBC Bank', 'Standard Chartered Bank', 'Deutsche Bank', 'DBS Bank',
    'Barclays Bank', 'Bank of America', 'JPMorgan Chase Bank', 'BNP Paribas', 'Credit Suisse',
  
    // Small Finance Banks
    'AU Small Finance Bank', 'Ujjivan Small Finance Bank', 'Equitas Small Finance Bank',
    'ESAF Small Finance Bank', 'Fincare Small Finance Bank', 'Jana Small Finance Bank',
    'Suryoday Small Finance Bank', 'Utkarsh Small Finance Bank', 'North East Small Finance Bank',
    'Shivalik Small Finance Bank',
  
    // Cooperative Banks (popular ones)
    'Saraswat Bank', 'Cosmos Bank', 'TJSB Sahakari Bank', 'NKGSB Bank', 'Apna Sahakari Bank'
  ];
  
  
  for (const bank of commonBanks) {
    if (sms.body.toLowerCase().includes(bank.toLowerCase())) {
      bankName = bank;
      break;
    }
  }

  let type: TransactionType;

  // Improved transaction type detection
  const smsTextLower = smsText.toLowerCase();
  
  // Check for UPI transactions first
  if (smsTextLower.includes('upi')) {
    // For UPI transactions, check the order of debited/credited
    const debitedIndex = smsTextLower.indexOf('debited');
    const creditedIndex = smsTextLower.indexOf('credited');
    
    if (debitedIndex !== -1 && creditedIndex !== -1) {
      // If 'debited' appears before 'credited', it's a debit transaction
      type = debitedIndex < creditedIndex ? 'debit' : 'credit';
    } else if (debitedIndex !== -1) {
      type = 'debit';
    } else if (creditedIndex !== -1) {
      type = 'credit';
    }
  } else {
    // For non-UPI transactions, use the original logic
    if (smsTextLower.includes('acct') && smsTextLower.includes('credited with')) {
      type = 'credit';
    } else if (smsTextLower.includes('debited')) {
      type = 'debit';
    } else if (smsTextLower.includes('credited')) {
      type = 'credit';
    }
  }

  // If type is still not determined, return null
  if (!type) return null;

  // Extract amount
  const amountMatch = smsText.match(/rs\.?\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Extract date
  const dateMatch = smsText.match(/(\d{1,2})[-/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-/](\d{2,4})/i);
  if (!dateMatch) return null;
  const [ , day, monthText, year ] = dateMatch;
  const monthIndex = getMonthIndex(monthText);
  const fullYear = year.length === 2 ? `20${year}` : year;
  const date = new Date(parseInt(fullYear), monthIndex, parseInt(day)).toISOString();

  // Determine payment method
  let paymentMethod: PaymentMethod = 'unknown';
  if (smsText.includes('upi')) paymentMethod = 'upi';
  else if (smsText.includes('card')) paymentMethod = 'card';
  else if (smsText.includes('neft') || smsText.includes('imps')) paymentMethod = 'bank_transfer';

  // Extract recipient or sender
  let recipient: string | null = null;

  if (type === 'credit') {
    let senderMatch = smsText.match(/from\s+([A-Z\s]+)/i);
    if (!senderMatch) senderMatch = smsText.match(/from\s+([a-z\s]+(?:bank|ltd|limited))/i);
    if (!senderMatch) senderMatch = smsText.match(/received\s+from\s+([a-z\s]+)/i);
    if (!senderMatch) senderMatch = smsText.match(/credited\s+by\s+([a-z\s]+)/i);
    if (!senderMatch) senderMatch = smsText.match(/sender\s*:\s*([a-z\s]+)/i);
    if (senderMatch) recipient = senderMatch[1].trim().toUpperCase();
  } else {
    // For debit transactions, check ICICI Bank specific pattern first
    const iciciDebitPattern = /debited[^;]+;\s*([a-z\s]+)\s+credited/i;
    const iciciMatch = sms.body.match(iciciDebitPattern);
    if (iciciMatch) {
      recipient = iciciMatch[1].trim().toUpperCase();
    } else {
      // Fallback to original pattern
      const creditNameMatch = smsText.match(/;\s*([a-z\s]+)\s+credited/i);
      if (creditNameMatch) recipient = creditNameMatch[1].trim().toUpperCase();
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
  return months.findIndex(m => month.toLowerCase().startsWith(m));
};
