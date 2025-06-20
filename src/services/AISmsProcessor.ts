import { Transaction, TransactionType, PaymentMethod } from '../types/transaction';
import { getDBConnection, insertRecord, checkDuplicate } from './database';

interface ParsedTransactionData {
  amount: number;
  date: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  bank: string;
  recipient: string | null;
  category: string;
  confidence: number;
  source_sms: string;
}

export class AISmsProcessor {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing AI SMS Processor...');
    this.isInitialized = true;
  }

  public async processSMS(smsText: string, smsDate: number): Promise<Transaction | null> {
    try {
      console.log('AI Processing SMS:', smsText.substring(0, 100) + '...');

      // Extract features and classify
      const classification = this.classifySMS(smsText);
      const confidence = this.calculateConfidence(smsText, classification);
      
      console.log('AI Classification:', {
        category: classification,
        confidence: confidence
      });

      // Parse transaction data based on classification
      const parsedData = await this.parseTransactionByCategory(smsText, smsDate, classification, confidence);
      
      if (!parsedData) {
        console.log('Failed to parse transaction data');
        return null;
      }

      // Check for duplicates
      const isDuplicate = await checkDuplicate('transactions', {
        amount: parsedData.amount,
        date: parsedData.date,
        type: parsedData.type,
        paymentMethod: parsedData.paymentMethod,
        recipient: parsedData.recipient
      });

      if (isDuplicate) {
        console.log('Duplicate transaction detected, skipping');
        return null;
      }

      // Insert into database
      const db = await getDBConnection();
      const transactionId = await insertRecord(db, 'transactions', {
        ...parsedData,
        created_at: new Date().toISOString()
      });

      if (transactionId > 0) {
        console.log(`AI processed transaction inserted: ${parsedData.type} Rs.${parsedData.amount} ${parsedData.category} (confidence: ${(confidence * 100).toFixed(1)}%)`);
        return {
          id: transactionId,
          ...parsedData
        } as Transaction;
      }

      return null;
    } catch (error) {
      console.error('Error in AI SMS processing:', error);
      return null;
    }
  }

  private classifySMS(smsText: string): string {
    const text = smsText.toLowerCase();
    
    // UPI Transactions
    if (text.includes('upi') && text.includes('vpa')) {
      return text.includes('debited') ? 'upi_debit' : 'upi_credit';
    }
    
    // Bank Transfers
    if (text.includes('neft') || text.includes('imps') || text.includes('rtgs')) {
      return text.includes('credited') ? 'bank_credit' : 'bank_debit';
    }
    
    // Credit Card
    if (text.includes('credit card') || text.includes('statement') || text.includes('bill')) {
      return 'credit_card_bill';
    }
    
    // ATM
    if (text.includes('atm') || text.includes('withdrawal')) {
      return 'atm_withdrawal';
    }
    
    // Shopping
    if (text.includes('amazon') || text.includes('flipkart') || text.includes('myntra')) {
      return 'shopping';
    }
    
    // Food
    if (text.includes('swiggy') || text.includes('zomato')) {
      return 'food_dining';
    }
    
    // Transport
    if (text.includes('uber') || text.includes('ola') || text.includes('rapido')) {
      return 'transportation';
    }
    
    // Recharge
    if (text.includes('recharge')) {
      return 'recharge';
    }
    
    // Bill Payment
    if (text.includes('bill') && text.includes('payment')) {
      return 'bill_payment';
    }
    
    // Investment
    if (text.includes('sip') || text.includes('mutual fund')) {
      return 'investment';
    }
    
    // Insurance
    if (text.includes('insurance') || text.includes('premium')) {
      return 'insurance';
    }
    
    // Loan/EMI
    if (text.includes('emi') || text.includes('loan')) {
      return 'loan_emi';
    }
    
    // Salary/Income
    if (text.includes('salary') || (text.includes('credited') && text.includes('from'))) {
      return 'salary_income';
    }
    
    // Refund
    if (text.includes('refund') || text.includes('return')) {
      return 'refund';
    }
    
    // Default classification based on transaction type
    if (text.includes('debited')) return 'Debit';
    if (text.includes('credited')) return 'Credit';
    
    return 'unknown';
  }

  private calculateConfidence(smsText: string, category: string): number {
    const text = smsText.toLowerCase();
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on specific patterns
    switch (category) {
      case 'upi_debit':
      case 'upi_credit':
        if (text.includes('vpa') && text.includes('ref no')) confidence += 0.3;
        if (text.includes('upi')) confidence += 0.2;
        break;
        
      case 'bank_credit':
      case 'bank_debit':
        if (text.includes('neft') || text.includes('imps')) confidence += 0.3;
        if (text.includes('account') || text.includes('acct')) confidence += 0.2;
        break;
        
      case 'credit_card_bill':
        if (text.includes('credit card') && text.includes('statement')) confidence += 0.4;
        if (text.includes('due date')) confidence += 0.2;
        break;
        
      case 'atm_withdrawal':
        if (text.includes('atm') && text.includes('withdrawal')) confidence += 0.4;
        break;
        
      case 'shopping':
        if (text.includes('amazon') || text.includes('flipkart')) confidence += 0.4;
        break;
        
      case 'food_dining':
        if (text.includes('swiggy') || text.includes('zomato')) confidence += 0.4;
        break;
        
      case 'transportation':
        if (text.includes('uber') || text.includes('ola')) confidence += 0.4;
        break;
        
      case 'salary_income':
        if (text.includes('salary')) confidence += 0.4;
        if (text.includes('credited') && text.includes('from')) confidence += 0.3;
        break;
    }
    
    return Math.min(confidence, 1.0);
  }

  private async parseTransactionByCategory(
    smsText: string, 
    smsDate: number, 
    category: string, 
    confidence: number
  ): Promise<ParsedTransactionData | null> {
    
    // Extract common data
    const amount = this.extractAmount(smsText);
    if (!amount) return null;

    const date = this.extractDate(smsText, smsDate);
    if (!date) return null;

    const bank = this.extractBankName(smsText);
    const type = this.determineTransactionType(smsText, category);
    const paymentMethod = this.determinePaymentMethod(smsText, category);
    const recipient = this.extractRecipient(smsText, type);

    return {
      amount,
      date,
      type,
      paymentMethod,
      bank,
      recipient,
      category,
      confidence,
      source_sms: smsText
    };
  }

  private extractAmount(smsText: string): number | null {
    const amountMatch = smsText.match(/rs\.?\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    return isNaN(amount) || amount <= 0 ? null : amount;
  }

  private extractDate(smsText: string, smsDate: number): string | null {
    // Try to extract date from SMS text first
    const dateMatch = smsText.match(/(\d{1,2})[-/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-/](\d{2,4})/i);
    if (dateMatch) {
      const [, day, monthText, year] = dateMatch;
      const monthIndex = this.getMonthIndex(monthText);
      const fullYear = year.length === 2 ? `20${year}` : year;
      return new Date(parseInt(fullYear), monthIndex, parseInt(day)).toISOString();
    }

    // Fallback to SMS timestamp
    return new Date(smsDate).toISOString();
  }

  private getMonthIndex(monthText: string): number {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(monthText.toLowerCase());
  }

  private extractBankName(smsText: string): string {
    const commonBanks = [
      'HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Citibank',
      'HSBC', 'Standard Chartered', 'RBL Bank', 'IDFC Bank', 'Yes Bank',
      'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank'
    ];

    for (const bank of commonBanks) {
      if (smsText.toLowerCase().includes(bank.toLowerCase())) {
        return bank;
      }
    }

    return 'Unknown Bank';
  }

  private determineTransactionType(smsText: string, category: string): TransactionType {
    const text = smsText.toLowerCase();
    
    // Check for explicit debit/credit indicators
    if (text.includes('debited')) return 'debit';
    if (text.includes('credited')) return 'credit';
    if (text.includes('withdrawn')) return 'debit';
    if (text.includes('received')) return 'credit';
    
    // Use category hints
    if (category.includes('credit')) return 'credit';
    if (category.includes('debit')) return 'debit';
    if (category.includes('withdrawal')) return 'debit';
    if (category.includes('salary') || category.includes('income')) return 'credit';
    if (category.includes('refund')) return 'credit';
    
    // Default to debit for most transaction types
    return 'debit';
  }

  private determinePaymentMethod(smsText: string, category: string): PaymentMethod {
    const text = smsText.toLowerCase();
    
    if (text.includes('upi')) return 'upi';
    if (text.includes('credit card')) return 'credit_card';
    if (text.includes('debit card')) return 'debit_card';
    if (text.includes('neft') || text.includes('imps') || text.includes('rtgs')) return 'net_banking';
    if (text.includes('atm')) return 'cash'; // ATM withdrawals are treated as cash
    if (text.includes('cash')) return 'cash';
    if (text.includes('wallet')) return 'wallet';
    
    // Use category hints
    if (category.includes('upi')) return 'upi';
    if (category.includes('credit_card')) return 'credit_card';
    if (category.includes('atm')) return 'cash'; // ATM withdrawals are treated as cash
    
    return 'unknown';
  }

  private extractRecipient(smsText: string, type: TransactionType): string | null {
    const text = smsText.toLowerCase();
    
    if (type === 'credit') {
      // For credits, look for sender
      const patterns = [
        /from\s+([A-Z\s]+)/i,
        /from\s+([a-z\s]+(?:bank|ltd|limited))/i,
        /received\s+from\s+([a-z\s]+)/i,
        /credited\s+by\s+([a-z\s]+)/i,
        /sender\s*:\s*([a-z\s]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = smsText.match(pattern);
        if (match && match[1]) {
          return match[1].trim().toUpperCase();
        }
      }
    } else {
      // For debits, look for recipient
      const patterns = [
        /to\s+([a-z\s]+(?:bank|ltd|limited))/i,
        /paid\s+to\s+([a-z\s]+)/i,
        /sent\s+to\s+([a-z\s]+)/i,
        /recipient\s*:\s*([a-z\s]+)/i,
        /debited[^;]+;\s*([a-z\s]+)\s+credited/i
      ];
      
      for (const pattern of patterns) {
        const match = smsText.match(pattern);
        if (match && match[1]) {
          return match[1].trim().toUpperCase();
        }
      }
    }

    // Fallback: extract capitalized words
    const words = smsText.split(/\s+/);
    const capitalizedWords = words.filter(word => /^[A-Z]/.test(word) && word.length > 2);
    const skipWords = ['ICICI', 'BANK', 'ACCT', 'UPI', 'CALL', 'SMS', 'BLOCK', 'DEAR', 'CUSTOMER'];
    const filteredWords = capitalizedWords.filter(word => !skipWords.includes(word));
    
    return filteredWords.length > 0 ? filteredWords[0] : null;
  }

  public async processMultipleSMS(smsList: Array<{ body: string; date: number; address: string }>): Promise<{
    success: boolean;
    count: number;
    error?: string;
  }> {
    try {
      let processedCount = 0;
      
      for (const sms of smsList) {
        const transaction = await this.processSMS(sms.body, sms.date);
        if (transaction) {
          processedCount++;
        }
      }

      return {
        success: true,
        count: processedCount
      };
    } catch (error) {
      console.error('Error processing multiple SMS:', error);
      return {
        success: false,
        count: 0,
        error: 'Failed to process SMS'
      };
    }
  }

  // Method to get classification confidence for debugging
  public getClassificationInfo(smsText: string): { category: string; confidence: number } {
    const category = this.classifySMS(smsText);
    const confidence = this.calculateConfidence(smsText, category);

    return {
      category,
      confidence
    };
  }
}

// Export singleton instance
export const aiSmsProcessor = new AISmsProcessor();