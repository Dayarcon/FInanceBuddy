import SmsAndroid from 'react-native-get-sms-android';
import { getDBConnection, saveTransaction, PaymentMethod, checkDuplicate } from './database';
import { insertCreditCardBill, CreditCardBill, CreditCardBillStatus } from './creditCardService';

type SMS = {
  body: string;
  date: number;
  address: string;
};

export const syncCreditCardBillSMS = async (): Promise<{ success: boolean; count: number; error?: string }> => {
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
          let billCount = 0;

          for (const sms of smsArray) {
            const bill = parseCreditCardBillSMS(sms);
            if (bill) {
              try {
                const billId = await insertCreditCardBill(bill);
                if (billId > 0) {
                  billCount++;
                  console.log(`Added credit card bill: ${bill.bankName} ${bill.cardNumber} - ₹${bill.totalAmount}`);
                }
              } catch (error) {
                console.error('Error inserting bill:', error);
              }
            }
          }

          resolve({ success: true, count: billCount });
        } catch (error) {
          console.error('Credit card bill SMS sync error:', error);
          resolve({ success: false, count: 0, error: 'Database error' });
        }
      }
    );
  });
};

const parseCreditCardBillSMS = (sms: SMS): CreditCardBill | null => {
  // Check if it's a bank SMS
  if (!sms.address.match(/(HDFC|ICICI|SBI|AXIS|KOTAK|YES|BANK|CARD)/i)) {
    return null;
  }

  const smsText = sms.body;
  
  // Pattern for YES BANK format
  // "YES BANK Credit Card XX1606 JUN-25 statement: Total due INR 5561.82 Min due INR 278.09 Due by 02-JUL-2025"
  const yesBankPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+([A-Z]+-\d{2})\s+statement:\s*Total\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Min\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Due\s+by\s+(\d{2}-[A-Z]+-\d{4})/i;
  
  const yesBankMatch = smsText.match(yesBankPattern);
  
  if (yesBankMatch) {
    const [, bankName, cardNumber, billPeriod, totalAmountStr, minimumDueStr, dueDateStr] = yesBankMatch;
    const totalAmount = parseFloat(totalAmountStr.replace(/,/g, ''));
    const minimumDue = parseFloat(minimumDueStr.replace(/,/g, ''));
    
    if (isNaN(totalAmount) || isNaN(minimumDue) || totalAmount <= 0) return null;

    const dueDate = convertDateToISO(dueDateStr);
    const statementDate = new Date(sms.date).toISOString();
    
    return {
      cardNumber,
      bankName: bankName.trim(),
      billPeriod: billPeriod.trim(),
      totalAmount,
      minimumDue,
      dueDate,
      statementDate,
      status: 'unpaid' as CreditCardBillStatus,
      paidAmount: 0,
      remainingAmount: totalAmount,
      sourceSms: smsText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Pattern for ICICI Bank format
  // "ICICI Bank Credit Card XX1234 JUN-25 statement: Total due Rs 4500.00 Min due Rs 450.00 Due by 15-JUL-2025"
  const iciciPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+([A-Z]+-\d{2})\s+statement:\s*Total\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Min\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Due\s+by\s+(\d{2}-[A-Z]+-\d{4})/i;
  
  const iciciMatch = smsText.match(iciciPattern);
  
  if (iciciMatch) {
    const [, bankName, cardNumber, billPeriod, totalAmountStr, minimumDueStr, dueDateStr] = iciciMatch;
    const totalAmount = parseFloat(totalAmountStr.replace(/,/g, ''));
    const minimumDue = parseFloat(minimumDueStr.replace(/,/g, ''));
    
    if (isNaN(totalAmount) || isNaN(minimumDue) || totalAmount <= 0) return null;

    const dueDate = convertDateToISO(dueDateStr);
    const statementDate = new Date(sms.date).toISOString();
    
    return {
      cardNumber,
      bankName: bankName.trim(),
      billPeriod: billPeriod.trim(),
      totalAmount,
      minimumDue,
      dueDate,
      statementDate,
      status: 'unpaid' as CreditCardBillStatus,
      paidAmount: 0,
      remainingAmount: totalAmount,
      sourceSms: smsText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Pattern for ICICI Bank email format
  // "ICICI Bank Credit Card XX5009 statement is sent to ...@gmail.com total of rs 4,669.69 or minimum of Rs 240.00 is due by 03-Jun-25"
  const iciciEmailPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+statement\s+is\s+sent\s+to\s+[^@]+@[^\s]+\s+total\s+of\s+(?:rs|inr)\s*([\d,]+\.?\d*)\s+or\s+minimum\s+of\s+(?:rs|inr)\s*([\d,]+\.?\d*)\s+is\s+due\s+by\s+(\d{2}-[A-Z]+-\d{2,4})/i;
  
  const iciciEmailMatch = smsText.match(iciciEmailPattern);
  
  if (iciciEmailMatch) {
    const [, bankName, cardNumber, totalAmountStr, minimumDueStr, dueDateStr] = iciciEmailMatch;
    const totalAmount = parseFloat(totalAmountStr.replace(/,/g, ''));
    const minimumDue = parseFloat(minimumDueStr.replace(/,/g, ''));
    
    if (isNaN(totalAmount) || isNaN(minimumDue) || totalAmount <= 0) return null;

    const dueDate = convertDateToISO(dueDateStr);
    const statementDate = new Date(sms.date).toISOString();
    
    // Try to extract bill period from SMS or use current month
    const billPeriodMatch = smsText.match(/([A-Z]+-\d{2})/);
    const billPeriod = billPeriodMatch ? billPeriodMatch[1] : getCurrentBillPeriod();
    
    return {
      cardNumber,
      bankName: bankName.trim(),
      billPeriod,
      totalAmount,
      minimumDue,
      dueDate,
      statementDate,
      status: 'unpaid' as CreditCardBillStatus,
      paidAmount: 0,
      remainingAmount: totalAmount,
      sourceSms: smsText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Pattern for HDFC Bank format
  // "HDFC Bank Credit Card XX5678 JUN-25 statement: Total due Rs 3200.50 Min due Rs 320.05 Due by 10-JUL-2025"
  const hdfcPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+)\s+([A-Z]+-\d{2})\s+statement:\s*Total\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Min\s+due\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*)\s+Due\s+by\s+(\d{2}-[A-Z]+-\d{4})/i;
  
  const hdfcMatch = smsText.match(hdfcPattern);
  
  if (hdfcMatch) {
    const [, bankName, cardNumber, billPeriod, totalAmountStr, minimumDueStr, dueDateStr] = hdfcMatch;
    const totalAmount = parseFloat(totalAmountStr.replace(/,/g, ''));
    const minimumDue = parseFloat(minimumDueStr.replace(/,/g, ''));
    
    if (isNaN(totalAmount) || isNaN(minimumDue) || totalAmount <= 0) return null;

    const dueDate = convertDateToISO(dueDateStr);
    const statementDate = new Date(sms.date).toISOString();
    
    return {
      cardNumber,
      bankName: bankName.trim(),
      billPeriod: billPeriod.trim(),
      totalAmount,
      minimumDue,
      dueDate,
      statementDate,
      status: 'unpaid' as CreditCardBillStatus,
      paidAmount: 0,
      remainingAmount: totalAmount,
      sourceSms: smsText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Generic pattern for other banks
  const genericPattern = /([A-Z\s]+)\s+(?:Bank\s+)?(?:Credit\s+Card|Debit\s+Card)\s+([A-Z0-9]+).*?(?:Total\s+due|total\s+due)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:Min\s+due|min\s+due)\s+(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:Due\s+by|due\s+by)\s+(\d{2}-[A-Z]+-\d{4})/i;
  
  const genericMatch = smsText.match(genericPattern);
  
  if (genericMatch) {
    const [, bankName, cardNumber, totalAmountStr, minimumDueStr, dueDateStr] = genericMatch;
    const totalAmount = parseFloat(totalAmountStr.replace(/,/g, ''));
    const minimumDue = parseFloat(minimumDueStr.replace(/,/g, ''));
    
    if (isNaN(totalAmount) || isNaN(minimumDue) || totalAmount <= 0) return null;

    const dueDate = convertDateToISO(dueDateStr);
    const statementDate = new Date(sms.date).toISOString();
    
    // Try to extract bill period from SMS
    const billPeriodMatch = smsText.match(/([A-Z]+-\d{2})/);
    const billPeriod = billPeriodMatch ? billPeriodMatch[1] : 'Unknown';
    
    return {
      cardNumber,
      bankName: bankName.trim(),
      billPeriod,
      totalAmount,
      minimumDue,
      dueDate,
      statementDate,
      status: 'unpaid' as CreditCardBillStatus,
      paidAmount: 0,
      remainingAmount: totalAmount,
      sourceSms: smsText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return null;
};

const convertDateToISO = (dateStr: string): string => {
  try {
    const match = dateStr.match(/(\d{2})[-/]([A-Za-z]+)[-/](\d{2,4})/);
    if (match) {
      const [, day, month, year] = match;
      const monthIndex = getMonthIndex(month);
      const fullYear = year.length === 2 ? `20${year}` : year;
      
      const date = new Date(parseInt(fullYear), monthIndex, parseInt(day));
      return date.toISOString();
    }
  } catch (error) {
    console.error('Error converting date:', error);
  }
  
  return new Date().toISOString();
};

const getMonthIndex = (month: string): number => {
  const months = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  const monthLower = month.toLowerCase();
  return months.findIndex(m => monthLower.startsWith(m));
};

const getCurrentBillPeriod = (): string => {
  const now = new Date();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear().toString().slice(-2);
  return `${month}-${year}`;
};

// Helper function to process credit card bill SMS
export const processCreditCardBillSms = async (smsText: string, date: string): Promise<void> => {
  try {
    // Extract card number
    const cardNumberMatch = smsText.match(/\b(\d{4})\b/);
    if (!cardNumberMatch) {
      console.log('No card number found in SMS');
      return;
    }
    const cardNumber = cardNumberMatch[1];

    // Extract bank name
    const bankNameMatch = smsText.match(/(ICICI|HDFC|SBI|AXIS|YES|KOTAK)\s+BANK/i);
    if (!bankNameMatch) {
      console.log('No bank name found in SMS');
      return;
    }
    const bankName = bankNameMatch[1].toUpperCase();

    // Extract bill period
    const billPeriodMatch = smsText.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*-\s*\d{4}/i);
    if (!billPeriodMatch) {
      console.log('No bill period found in SMS');
      return;
    }
    const billPeriod = billPeriodMatch[0].toUpperCase();

    // Extract total amount
    const amountMatch = smsText.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    if (!amountMatch) {
      console.log('No amount found in SMS');
      return;
    }
    const totalAmount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Extract minimum due
    const minimumDueMatch = smsText.match(/minimum due[:\s]+₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (!minimumDueMatch) {
      console.log('No minimum due found in SMS');
      return;
    }
    const minimumDue = parseFloat(minimumDueMatch[1].replace(/,/g, ''));

    // Extract due date
    const dueDateMatch = smsText.match(/due date[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
    if (!dueDateMatch) {
      console.log('No due date found in SMS');
      return;
    }
    const dueDate = dueDateMatch[1];

    // Extract statement date
    const statementDateMatch = smsText.match(/statement date[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})/i);
    if (!statementDateMatch) {
      console.log('No statement date found in SMS');
      return;
    }
    const statementDate = statementDateMatch[1];

    // Create bill object
    const bill: CreditCardBill = {
      cardNumber,
      bankName,
      billPeriod,
      totalAmount,
      minimumDue,
      dueDate,
      statementDate,
      status: 'unpaid' as CreditCardBillStatus,
      paidAmount: 0,
      remainingAmount: totalAmount,
      sourceSms: smsText,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check for duplicate bill
    const isDuplicate = await checkDuplicate('credit_card_bills', {
      cardNumber: bill.cardNumber,
      billPeriod: bill.billPeriod
    });

    if (isDuplicate) {
      console.log('Duplicate bill found, skipping insertion');
      return;
    }

    // Insert bill
    const billId = await insertCreditCardBill(bill);
    console.log(`Inserted credit card bill with ID: ${billId}`);

  } catch (error) {
    console.error('Error processing credit card bill SMS:', error);
    throw error;
  }
}; 