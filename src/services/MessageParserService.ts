import { format, parseISO } from 'date-fns';

export interface ParsedBill {
  bankName: string;
  amount: number;
  dueDate: string;
  message: string;
  isOverdue: boolean;
}

export interface Transaction {
  date: string;
  type: string;
  amount: number;
  party: string;
  upi_reference: string;
  bank: string;
  paymentMethod: string;
}

export class MessageParserService {
  private commonBanks = [
    'HDFC Bank',
    'ICICI Bank',
    'SBI',
    'Axis Bank',
    'Kotak Bank',
    'Citibank',
    'HSBC',
    'Standard Chartered',
    'RBL Bank',
    'IDFC Bank',
    'Yes Bank',
    'Bank of Baroda',
    'Punjab National Bank',
    'Canara Bank',
    'Union Bank',
  ];

  extractAmount(message: string): number | null {
    // Match patterns like "Rs. 1,234.56", "₹1,234.56", "INR 1,234.56"
    const amountPattern = /(?:Rs\.|₹|INR)\s*([\d,]+\.?\d*)/i;
    const match = message.match(amountPattern);
    
    if (match) {
      // Remove commas and convert to number
      return parseFloat(match[1].replace(/,/g, ''));
    }
    
    return null;
  }

  extractBankName(message: string): string {
    // First check for common bank names
    for (const bank of this.commonBanks) {
      if (message.toLowerCase().includes(bank.toLowerCase())) {
        return bank;
      }
    }

    // Try to extract bank name from common patterns
    const patterns = [
      /(?:from|by)\s+([A-Za-z\s]+(?:Bank|Ltd|Limited))/i,
      /(?:credit\s+card\s+statement\s+from)\s+([A-Za-z\s]+(?:Bank|Ltd|Limited))/i,
      /(?:statement\s+from)\s+([A-Za-z\s]+(?:Bank|Ltd|Limited))/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Unknown Bank';
  }

  extractDueDate(message: string): string | null {
    // Match various date formats
    const datePatterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(?:due\s+date|due\s+by|payment\s+due)\s*(?:is|on|by)?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      // DD MMM YYYY
      /(?:due\s+date|due\s+by|payment\s+due)\s*(?:is|on|by)?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i,
      // YYYY-MM-DD
      /(?:due\s+date|due\s+by|payment\s+due)\s*(?:is|on|by)?\s*(\d{4}-\d{2}-\d{2})/i,
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        try {
          // Try to parse the date
          const date = new Date(match[1]);
          if (!isNaN(date.getTime())) {
            return format(date, 'yyyy-MM-dd');
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
    }

    return null;
  }

  isOverdue(message: string, dueDate: string): boolean {
    const today = new Date();
    const parsedDueDate = parseISO(dueDate);
    
    // Check for overdue keywords in message
    const overdueKeywords = ['overdue', 'late', 'delayed', 'past due'];
    const hasOverdueKeyword = overdueKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    return hasOverdueKeyword || today > parsedDueDate;
  }

  parseCreditCardMessage(message: string): ParsedBill | null {
    const amount = this.extractAmount(message);
    if (!amount) return null;

    const bankName = this.extractBankName(message);
    const dueDate = this.extractDueDate(message);
    
    if (!dueDate) return null;

    return {
      bankName,
      amount,
      dueDate,
      message,
      isOverdue: this.isOverdue(message, dueDate),
    };
  }

  parseMultipleMessages(messages: string[]): ParsedBill[] {
    return messages
      .map(message => this.parseCreditCardMessage(message))
      .filter((bill): bill is ParsedBill => bill !== null);
  }

  public parseBankMessage(message: string): Transaction | null {
    try {
      // Extract bank name - look for bank name in both credit and debit messages
      let bank = 'Unknown Bank';
      for (const bankName of this.commonBanks) {
        if (message.toLowerCase().includes(bankName.toLowerCase())) {
          bank = bankName;
          break;
        }
      }

      // Determine if it's a credit or debit transaction
      const isCredit = message.toLowerCase().includes('credited');
      const isDebit = message.toLowerCase().includes('debited');
      const type = isCredit ? 'credit' : isDebit ? 'debit' : null;

      if (!type) return null;

      // Extract amount
      const amountMatch = message.match(/Rs\.?\s*([\d,]+(\.\d{2})?)/i);
      if (!amountMatch) return null;
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

      // Extract date
      const dateMatch = message.match(/(\d{2})-([A-Za-z]{3})-(\d{2})/);
      if (!dateMatch) return null;
      const date = dateMatch[0];

      // Extract party name
      let party = '';
      if (type === 'credit') {
        const creditMatch = message.match(/from\s+([^.]+)/i);
        party = creditMatch ? creditMatch[1].trim() : '';
      } else {
        // For debit transactions, look for the pattern: "debited for Rs X; [PARTY] credited"
        const debitMatch = message.match(/debited[^;]+;\s*([^.]+)\s+credited/i);
        party = debitMatch ? debitMatch[1].trim() : '';
      }

      // Extract UPI reference if present
      const upiMatch = message.match(/UPI:(\d+)/);
      const upiReference = upiMatch ? upiMatch[1] : '';

      return {
        date,
        type,
        amount,
        party,
        upi_reference: upiReference,
        bank,
        paymentMethod: 'UPI'
      };
    } catch (error) {
      console.error('Error parsing bank message:', error);
      return null;
    }
  }

  public parseMultipleTransactions(message: string): Transaction[] {
    const transactions: Transaction[] = [];
    
    // Split the message into individual transaction messages
    const transactionTexts = message.split('ICICI Bank');
    
    for (const text of transactionTexts) {
      if (!text.trim()) continue;
      
      const transaction = this.parseBankMessage(text);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }
}

export const messageParserService = new MessageParserService(); 