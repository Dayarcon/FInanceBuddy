import { format, parseISO } from 'date-fns';

export interface ParsedBill {
  bankName: string;
  amount: number;
  dueDate: string;
  message: string;
  isOverdue: boolean;
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
}

export const messageParserService = new MessageParserService(); 