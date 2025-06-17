import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction as BaseTransaction } from '../types/transaction';

// Define transaction types
export type Transaction = BaseTransaction;

// Define category types
export type Category = 
  | 'Food & Dining'
  | 'Shopping'
  | 'Transportation'
  | 'Entertainment'
  | 'Bills & Utilities'
  | 'Health & Fitness'
  | 'Travel'
  | 'Education'
  | 'Personal Care'
  | 'Gifts & Donations'
  | 'Investments'
  | 'Wallet'
  | 'Salary'
  | 'Other';

export type CategoryDefinition = {
  name: Category;
  keywords: string[];
  color: string;
  icon: string;
};

interface LearnedRule {
  pattern: string;
  category: Category;
  confidence: number;
  lastUsed: number;
  usageCount: number;
}

interface TrainingData {
  text: string;
  category: Category;
}

// Rule-based categorization keywords with colors and icons
export const categoryRules: Record<Category, CategoryDefinition> = {
  'Food & Dining': {
    name: 'Food & Dining',
    keywords: ['zomato', 'swiggy', 'restaurant', 'cafe', 'coffee', 'food delivery', 'food', 'dining', 'restaurant', 'cafe', 'coffee shop', 'food court'],
    color: '#FF9800',
    icon: 'restaurant'
  },
  'Shopping': {
    name: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'shop', 'store', 'retail', 'shopping', 'mall', 'market'],
    color: '#9C27B0',
    icon: 'bag-handle'
  },
  'Transportation': {
    name: 'Transportation',
    keywords: ['uber', 'ola', 'metro', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'rapido', 'ride', 'transport', 'travel', 'cab', 'taxi', 'auto'],
    color: '#2196F3',
    icon: 'car'
  },
  'Entertainment': {
    name: 'Entertainment',
    keywords: ['netflix', 'prime', 'hotstar', 'movie', 'theatre', 'cinema', 'streaming', 'subscription'],
    color: '#E91E63',
    icon: 'game-controller'
  },
  'Bills & Utilities': {
    name: 'Bills & Utilities',
    keywords: ['electricity', 'water', 'gas', 'internet', 'mobile', 'broadband', 'bill', 'utility', 'payment'],
    color: '#F44336',
    icon: 'receipt'
  },
  'Health & Fitness': {
    name: 'Health & Fitness',
    keywords: ['pharmacy', 'hospital', 'doctor', 'gym', 'fitness', 'medical', 'health', 'clinic'],
    color: '#00BCD4',
    icon: 'medical'
  },
  'Travel': {
    name: 'Travel',
    keywords: ['flight', 'hotel', 'booking', 'trip', 'travel', 'vacation', 'holiday'],
    color: '#795548',
    icon: 'airplane'
  },
  'Education': {
    name: 'Education',
    keywords: ['course', 'school', 'college', 'university', 'training', 'education', 'learning'],
    color: '#795548',
    icon: 'school'
  },
  'Personal Care': {
    name: 'Personal Care',
    keywords: ['salon', 'spa', 'beauty', 'cosmetics', 'personal care', 'grooming'],
    color: '#9C27B0',
    icon: 'cut'
  },
  'Gifts & Donations': {
    name: 'Gifts & Donations',
    keywords: ['gift', 'donation', 'charity', 'contribution'],
    color: '#4CAF50',
    icon: 'gift'
  },
  'Investments': {
    name: 'Investments',
    keywords: ['stocks', 'mutual', 'fund', 'investment', 'trading', 'share'],
    color: '#FFC107',
    icon: 'trending-up'
  },
  'Wallet': {
    name: 'Wallet',
    keywords: ['paytm', 'phonepe', 'gpay', 'wallet', 'upi', 'payment app'],
    color: '#2196F3',
    icon: 'wallet'
  },
  'Salary': {
    name: 'Salary',
    keywords: ['salary', 'income', 'credit', 'deposit', 'payment received'],
    color: '#4CAF50',
    icon: 'cash'
  },
  'Other': {
    name: 'Other',
    keywords: [],
    color: '#607D8B',
    icon: 'help-circle'
  }
};

// Add this function to get category definition
export const getCategoryDefinition = (categoryName: string): CategoryDefinition => {
  return categoryRules[categoryName as Category] || categoryRules['Other'];
};

class TransactionCategorizer {
  private storageKey = '@transaction_categories';
  private learnedRules: LearnedRule[] = [];
  private trainingData: TrainingData[] = [];
  private readonly MIN_CONFIDENCE = 0.7;
  private readonly MAX_LEARNED_RULES = 100;

  constructor() {
    this.initializeClassifier();
  }

  private async initializeClassifier() {
    try {
      const savedData = await AsyncStorage.getItem(this.storageKey);
      if (savedData) {
        const { trainingData, learnedRules } = JSON.parse(savedData);
        this.trainingData = trainingData || [];
        this.learnedRules = learnedRules || [];
      }
    } catch (error) {
      console.error('Error initializing classifier:', error);
    }
  }

  private async saveTrainingData() {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify({ 
        trainingData: this.trainingData,
        learnedRules: this.learnedRules
      }));
    } catch (error) {
      console.error('Error saving training data:', error);
    }
  }

  private extractTransactionText(transaction: Transaction): string {
    // Remove common transaction type words that might interfere with categorization
    const text = `${transaction.notes || ''} ${transaction.source_sms || ''} ${transaction.recipient || ''} ${transaction.account || ''} ${transaction.bank || ''}`.toLowerCase();
    const cleanedText = text
      .replace(/\b(credited|debited|credit|debit|received|sent|paid|payment|transaction)\b/g, '')
      .replace(/\b(rs\.?|inr|account|balance|available|transaction|id|ref|upi|imps|neft)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('Transaction Text:', {
      original: text,
      cleaned: cleanedText,
      patterns: this.extractPatterns(text)
    });
    
    return cleanedText;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private extractPatterns(text: string): string[] {
    console.log('\n=== Extracting Patterns ===');
    console.log('Input text:', text);
    
    // Split into words and clean
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    console.log('Split words:', words);
    
    // Common words to exclude from merchant names
    const excludeWords = new Set([
      'bank', 'acct', 'account', 'debit', 'credit', 'rs', 'inr', 'paid', 'to', 'from',
      'upi', 'transaction', 'id', 'ref', 'no', 'date', 'time', 'for', 'on', 'at', 'the',
      'a', 'an', 'and', 'or', 'but', 'in', 'out', 'of', 'by', 'with', 'via', 'through',
      'call', 'sms', 'block', 'dispute', 'help', 'support', 'customer', 'service'
    ]);

    // Extract merchant names and important identifiers
    const merchantWords = words.filter(word => {
      // Remove common suffixes and clean the word
      const cleanWord = word.replace(/[.,;:!?]$/, '');
      
      // Skip if it's a number or excluded word
      if (/^\d+$/.test(cleanWord) || excludeWords.has(cleanWord)) {
        return false;
      }
      
      // Keep words that look like merchant names (start with capital letter or are all caps)
      return /^[A-Z]/.test(cleanWord) || /^[A-Z]+$/.test(cleanWord);
    });

    console.log('Extracted merchant words:', merchantWords);

    // Extract patterns using regex
    const patterns: string[] = [];
    
    // Pattern for merchant names after "credited" or "debited"
    const merchantPattern = /(?:credited|debited)(?:\s+for|\s+by|\s+to|\s+from)?\s+([A-Za-z]+)/i;
    const merchantMatch = text.match(merchantPattern);
    if (merchantMatch) {
      patterns.push(merchantMatch[1]);
    }

    // Add merchant words to patterns
    patterns.push(...merchantWords);

    console.log('\nChecking patterns:');
    patterns.forEach(pattern => {
      console.log(`Pattern: ${pattern}`);
    });

    console.log('\nFinal extracted patterns:', patterns);
    return patterns;
  }

  private ruleBasedCategorization(text: string, type: 'credit' | 'debit'): Category {
    console.log('\n=== Starting Categorization ===');
    console.log('Input text:', text);
    console.log('Transaction type:', type);

    const patterns = this.extractPatterns(text);
    const lowerText = text.toLowerCase();

    // First check for transportation-related keywords
    const transportKeywords = categoryRules['Transportation'].keywords;
    for (const keyword of transportKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        console.log(`Matched transportation keyword: ${keyword}`);
        return 'Transportation';
      }
    }

    // Then check other categories
    for (const [category, definition] of Object.entries(categoryRules)) {
      if (category === 'Transportation') continue; // Skip as we already checked

      for (const keyword of definition.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          console.log(`Matched ${category} keyword: ${keyword}`);
          return category as Category;
        }
      }
    }

    // If no matches found, return default category based on type
    const defaultCategory = type === 'credit' ? 'Salary' : 'Other';
    console.log(`No matches found, using default category: ${defaultCategory}`);
    return defaultCategory;
  }

  private mlBasedCategorization(transaction: Transaction): Category {
    const text = this.extractTransactionText(transaction);
    
    // Find the most similar transaction in training data
    let bestMatch: { category: Category; similarity: number } | null = null;
    
    for (const trainingItem of this.trainingData) {
      const similarity = this.calculateSimilarity(text, trainingItem.text);
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { category: trainingItem.category, similarity };
      }
    }
    
    // If we have a good match, use it
    if (bestMatch && bestMatch.similarity > 0.5) {
      return bestMatch.category;
    }
    
    // Default categorization based on transaction type
    if (transaction.type === 'credit') {
      return 'Salary';
    }
    
    return 'Other';
  }

  public async categorizeTransaction(transaction: Transaction): Promise<Transaction> {
    console.log('Categorizing transaction:', {
      id: transaction.id,
      type: transaction.type,
      recipient: transaction.recipient,
      notes: transaction.notes,
      source_sms: transaction.source_sms
    });

    // Try rule-based categorization first
    const ruleBasedCategory = this.ruleBasedCategorization(this.extractTransactionText(transaction), transaction.type as 'credit' | 'debit');
    if (ruleBasedCategory) {
      console.log('Using rule-based category:', ruleBasedCategory);
      return { ...transaction, category: ruleBasedCategory };
    }

    // Fall back to ML-based categorization
    const mlCategory = this.mlBasedCategorization(transaction);
    console.log('Using ML-based category:', mlCategory);
    return { ...transaction, category: mlCategory };
  }

  public async learnFromCorrection(transaction: Transaction, correctedCategory: Category) {
    const text = this.extractTransactionText(transaction);
    
    // Add to training data
    this.trainingData.push({ text, category: correctedCategory });

    // Extract potential patterns from the transaction
    const patterns = this.extractPatterns(text);
    
    // Add new learned rules
    for (const pattern of patterns) {
      const existingRule = this.learnedRules.find(r => r.pattern === pattern);
      if (existingRule) {
        existingRule.confidence = Math.min(1, existingRule.confidence + 0.1);
        existingRule.lastUsed = Date.now();
        existingRule.usageCount++;
      } else {
        this.learnedRules.push({
          pattern,
          category: correctedCategory,
          confidence: 0.8,
          lastUsed: Date.now(),
          usageCount: 1
        });
      }
    }

    // Clean up old rules
    this.cleanupLearnedRules();

    // Save the updated data
    await this.saveTrainingData();
  }

  private cleanupLearnedRules() {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Remove rules that haven't been used in 30 days or have low confidence
    this.learnedRules = this.learnedRules.filter(rule => 
      rule.lastUsed > thirtyDaysAgo && rule.confidence >= this.MIN_CONFIDENCE
    );

    // If still too many rules, remove the least used ones
    if (this.learnedRules.length > this.MAX_LEARNED_RULES) {
      this.learnedRules.sort((a, b) => b.usageCount - a.usageCount);
      this.learnedRules = this.learnedRules.slice(0, this.MAX_LEARNED_RULES);
    }
  }
}

// Export a singleton instance
export const transactionCategorizer = new TransactionCategorizer(); 