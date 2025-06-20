import { Transaction, TransactionType, PaymentMethod } from '../types/transaction';
import { getDBConnection, insertRecord, checkDuplicate } from './database';
import SmsAndroid from 'react-native-get-sms-android';
import { aiSmsProcessor } from './AISmsProcessor';

type SMS = {
  body: string;
  date: number;
  address: string;
};

interface AITransactionResult {
  transaction: Transaction | null;
  category: string;
  confidence: number;
  processingTime: number;
  aiFeatures: Record<string, any>;
}

export class EnhancedAISmsService {
  private processingStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    averageConfidence: 0,
    categories: {} as Record<string, number>
  };

  /**
   * Main method to sync SMS transactions using AI processing
   */
  public async syncTransactionsWithAI(): Promise<{
    success: boolean;
    count: number;
    stats: typeof this.processingStats;
    error?: string;
  }> {
    return new Promise((resolve) => {
      SmsAndroid.list(
        JSON.stringify({
          box: 'inbox',
          sort: true,
          maxCount: 1000 // Process more messages
        }),
        (fail: any) => {
          console.error('Failed to get SMS:', fail);
          resolve({ 
            success: false, 
            count: 0, 
            stats: this.processingStats,
            error: 'Failed to get SMS' 
          });
        },
        async (count: number, smsList: string) => {
          try {
            const smsArray: SMS[] = JSON.parse(smsList);
            let processedCount = 0;
            
            console.log(`AI Processing ${smsArray.length} SMS messages...`);

            for (const sms of smsArray) {
              try {
                const result = await this.processSingleSMSWithAI(sms);
                if (result.transaction) {
                  processedCount++;
                  this.updateStats(result);
                }
              } catch (error) {
                console.error('Error processing SMS:', error);
                this.processingStats.failed++;
              }
            }

            this.processingStats.totalProcessed = smsArray.length;
            this.processingStats.successful = processedCount;
            
            if (this.processingStats.successful > 0) {
              this.processingStats.averageConfidence = 
                this.processingStats.averageConfidence / this.processingStats.successful;
            }

            console.log('AI SMS Processing Complete:', {
              total: smsArray.length,
              processed: processedCount,
              stats: this.processingStats
            });

            resolve({
              success: true,
              count: processedCount,
              stats: this.processingStats
            });
          } catch (error) {
            console.error('AI SMS sync error:', error);
            resolve({
              success: false,
              count: 0,
              stats: this.processingStats,
              error: 'Failed to sync SMS transactions'
            });
          }
        }
      );
    });
  }

  /**
   * Process a single SMS with AI and enhanced features
   */
  public async processSingleSMSWithAI(sms: SMS): Promise<AITransactionResult> {
    const startTime = Date.now();
    
    try {
      // Skip non-bank SMS
      if (!this.isBankSMS(sms.body)) {
        return {
          transaction: null,
          category: 'non_bank',
          confidence: 0,
          processingTime: Date.now() - startTime,
          aiFeatures: {}
        };
      }

      // Extract AI features
      const aiFeatures = this.extractAIFeatures(sms.body);
      
      // Get AI classification
      const classification = aiSmsProcessor.getClassificationInfo(sms.body);
      
      // Enhanced transaction parsing with AI insights
      const transaction = await this.parseTransactionWithAI(sms, classification, aiFeatures);
      
      const processingTime = Date.now() - startTime;

      return {
        transaction,
        category: classification.category,
        confidence: classification.confidence,
        processingTime,
        aiFeatures
      };
    } catch (error) {
      console.error('Error in AI SMS processing:', error);
      return {
        transaction: null,
        category: 'error',
        confidence: 0,
        processingTime: Date.now() - startTime,
        aiFeatures: {}
      };
    }
  }

  /**
   * Enhanced transaction parsing with AI insights
   */
  private async parseTransactionWithAI(
    sms: SMS, 
    classification: { category: string; confidence: number },
    aiFeatures: Record<string, any>
  ): Promise<Transaction | null> {
    
    // Extract basic transaction data
    const amount = this.extractAmount(sms.body);
    if (!amount) return null;

    const date = this.extractDate(sms.body, sms.date);
    if (!date) return null;

    const bank = this.extractBankName(sms.body);
    const type = this.determineTransactionType(sms.body, classification.category);
    const paymentMethod = this.determinePaymentMethod(sms.body, classification.category);
    const recipient = this.extractRecipient(sms.body, type);

    // Enhanced categorization based on AI insights
    const enhancedCategory = this.getEnhancedCategory(classification.category, aiFeatures);
    
    // Check for duplicates
    const isDuplicate = await checkDuplicate('transactions', {
      amount,
      date,
      type,
      paymentMethod,
      recipient
    });

    if (isDuplicate) {
      console.log('Duplicate transaction detected, skipping');
      return null;
    }

    // Insert into database
    const db = await getDBConnection();
    const transactionId = await insertRecord(db, 'transactions', {
      amount,
      date,
      type,
      paymentMethod,
      bank,
      recipient,
      category: enhancedCategory,
      confidence: classification.confidence,
      source_sms: sms.body,
      ai_features: JSON.stringify(aiFeatures),
      created_at: new Date().toISOString()
    });

    if (transactionId > 0) {
      console.log(`AI Enhanced Transaction: ${type} Rs.${amount} ${enhancedCategory} (${(classification.confidence * 100).toFixed(1)}% confidence)`);
      
      return {
        id: transactionId,
        amount,
        date,
        type,
        paymentMethod,
        bank,
        recipient,
        category: enhancedCategory,
        confidence: classification.confidence,
        source_sms: sms.body,
        ai_features: aiFeatures
      } as Transaction;
    }

    return null;
  }

  /**
   * Extract advanced AI features from SMS
   */
  private extractAIFeatures(smsText: string): Record<string, any> {
    const text = smsText.toLowerCase();
    const features: Record<string, any> = {};

    // Transaction patterns
    features.hasAmount = /rs\.?\s*[\d,]+\.?\d*/i.test(text);
    features.hasDate = /\d{1,2}[-/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-/]\d{2,4}/i.test(text);
    features.hasTime = /\d{2}:\d{2}:\d{2}/.test(text);
    features.hasReference = /ref\s*no|reference|transaction\s*id/i.test(text);

    // Payment method indicators
    features.paymentMethods = {
      upi: text.includes('upi'),
      neft: text.includes('neft'),
      imps: text.includes('imps'),
      rtgs: text.includes('rtgs'),
      atm: text.includes('atm'),
      card: text.includes('card'),
      cash: text.includes('cash'),
      wallet: text.includes('wallet')
    };

    // Transaction type indicators
    features.transactionTypes = {
      debit: text.includes('debited'),
      credit: text.includes('credited'),
      withdrawal: text.includes('withdrawn'),
      payment: text.includes('payment'),
      received: text.includes('received'),
      sent: text.includes('sent')
    };

    // Merchant/Service indicators
    features.merchants = {
      amazon: text.includes('amazon'),
      flipkart: text.includes('flipkart'),
      swiggy: text.includes('swiggy'),
      zomato: text.includes('zomato'),
      uber: text.includes('uber'),
      ola: text.includes('ola'),
      rapido: text.includes('rapido'),
      paytm: text.includes('paytm'),
      phonepe: text.includes('phonepe'),
      googlepay: text.includes('google pay') || text.includes('gpay')
    };

    // Amount analysis
    const amountMatch = text.match(/rs\.?\s*([\d,]+\.?\d*)/i);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      features.amountAnalysis = {
        amount,
        amountRange: this.getAmountRange(amount),
        isHighValue: amount > 10000,
        isLowValue: amount < 100
      };
    }

    // Text complexity
    features.textComplexity = {
      wordCount: text.split(/\s+/).length,
      hasSpecialChars: /[^a-zA-Z0-9\s]/.test(text),
      hasNumbers: /\d/.test(text),
      hasUppercase: /[A-Z]/.test(smsText)
    };

    // Bank specific features
    features.bankFeatures = {
      hasAccountNumber: /acct|account|xx\d+/i.test(text),
      hasCardNumber: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/.test(text),
      hasVPA: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)
    };

    return features;
  }

  /**
   * Get enhanced category based on AI features
   */
  private getEnhancedCategory(baseCategory: string, features: Record<string, any>): string {
    // Enhance base category with additional context
    if (baseCategory === 'shopping') {
      if (features.merchants.amazon) return 'shopping_amazon';
      if (features.merchants.flipkart) return 'shopping_flipkart';
      return 'shopping_other';
    }

    if (baseCategory === 'food_dining') {
      if (features.merchants.swiggy) return 'food_swiggy';
      if (features.merchants.zomato) return 'food_zomato';
      return 'food_other';
    }

    if (baseCategory === 'transportation') {
      if (features.merchants.uber) return 'transport_uber';
      if (features.merchants.ola) return 'transport_ola';
      if (features.merchants.rapido) return 'transport_rapido';
      return 'transport_other';
    }

    if (baseCategory === 'upi_debit' || baseCategory === 'upi_credit') {
      if (features.merchants.paytm) return 'upi_paytm';
      if (features.merchants.phonepe) return 'upi_phonepe';
      if (features.merchants.googlepay) return 'upi_googlepay';
      return baseCategory;
    }

    return baseCategory;
  }

  /**
   * Check if SMS is from a bank
   */
  private isBankSMS(smsText: string): boolean {
    const bankKeywords = [
      'bank', 'icici', 'hdfc', 'sbi', 'axis', 'kotak', 'citibank', 'hsbc',
      'standard chartered', 'rbl', 'idfc', 'yes bank', 'bank of baroda',
      'punjab national bank', 'canara bank', 'union bank'
    ];

    return bankKeywords.some(keyword => 
      smsText.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Extract amount from SMS
   */
  private extractAmount(smsText: string): number | null {
    const amountMatch = smsText.match(/rs\.?\s*([\d,]+\.?\d*)/i);
    if (!amountMatch) return null;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    return isNaN(amount) || amount <= 0 ? null : amount;
  }

  /**
   * Extract date from SMS
   */
  private extractDate(smsText: string, smsDate: number): string | null {
    const dateMatch = smsText.match(/(\d{1,2})[-/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-/](\d{2,4})/i);
    if (dateMatch) {
      const [, day, monthText, year] = dateMatch;
      const monthIndex = this.getMonthIndex(monthText);
      const fullYear = year.length === 2 ? `20${year}` : year;
      return new Date(parseInt(fullYear), monthIndex, parseInt(day)).toISOString();
    }
    return new Date(smsDate).toISOString();
  }

  /**
   * Get month index
   */
  private getMonthIndex(monthText: string): number {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(monthText.toLowerCase());
  }

  /**
   * Extract bank name
   */
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

  /**
   * Determine transaction type
   */
  private determineTransactionType(smsText: string, category: string): TransactionType {
    const text = smsText.toLowerCase();
    
    if (text.includes('debited')) return 'debit';
    if (text.includes('credited')) return 'credit';
    if (text.includes('withdrawn')) return 'debit';
    if (text.includes('received')) return 'credit';
    
    if (category.includes('credit')) return 'credit';
    if (category.includes('debit')) return 'debit';
    if (category.includes('withdrawal')) return 'debit';
    if (category.includes('salary') || category.includes('income')) return 'credit';
    if (category.includes('refund')) return 'credit';
    
    return 'debit';
  }

  /**
   * Determine payment method
   */
  private determinePaymentMethod(smsText: string, category: string): PaymentMethod {
    const text = smsText.toLowerCase();
    
    if (text.includes('upi')) return 'upi';
    if (text.includes('credit card')) return 'credit_card';
    if (text.includes('debit card')) return 'debit_card';
    if (text.includes('neft') || text.includes('imps') || text.includes('rtgs')) return 'net_banking';
    if (text.includes('atm')) return 'atm';
    if (text.includes('cash')) return 'cash';
    if (text.includes('wallet')) return 'wallet';
    
    if (category.includes('upi')) return 'upi';
    if (category.includes('credit_card')) return 'credit_card';
    if (category.includes('atm')) return 'atm';
    
    return 'unknown';
  }

  /**
   * Extract recipient/sender
   */
  private extractRecipient(smsText: string, type: TransactionType): string | null {
    const text = smsText.toLowerCase();
    
    if (type === 'credit') {
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

  /**
   * Get amount range for analysis
   */
  private getAmountRange(amount: number): number {
    if (amount <= 100) return 1;
    if (amount <= 500) return 2;
    if (amount <= 1000) return 3;
    if (amount <= 5000) return 4;
    if (amount <= 10000) return 5;
    return 6; // > 10000
  }

  /**
   * Update processing statistics
   */
  private updateStats(result: AITransactionResult) {
    this.processingStats.successful++;
    this.processingStats.averageConfidence += result.confidence;
    
    if (result.category) {
      this.processingStats.categories[result.category] = 
        (this.processingStats.categories[result.category] || 0) + 1;
    }
  }

  /**
   * Get processing statistics
   */
  public getStats() {
    return this.processingStats;
  }

  /**
   * Reset statistics
   */
  public resetStats() {
    this.processingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      averageConfidence: 0,
      categories: {}
    };
  }
}

// Export singleton instance
export const enhancedAISmsService = new EnhancedAISmsService();
