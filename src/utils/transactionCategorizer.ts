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

// Rule-based categorization keywords
export const categoryRules: Record<Category, string[]> = {
  'Food & Dining': ['zomato', 'swiggy', 'food', 'restaurant', 'cafe', 'coffee'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'shop', 'store', 'retail'],
  'Transportation': ['uber', 'ola', 'metro', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'rapido'],
  'Entertainment': ['netflix', 'prime', 'hotstar', 'movie', 'theatre'],
  'Bills & Utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'broadband'],
  'Health & Fitness': ['pharmacy', 'hospital', 'doctor', 'gym', 'fitness'],
  'Travel': ['flight', 'hotel', 'booking', 'trip', 'travel'],
  'Education': ['course', 'school', 'college', 'university', 'training'],
  'Personal Care': ['salon', 'spa', 'beauty', 'cosmetics'],
  'Gifts & Donations': ['gift', 'donation', 'charity'],
  'Investments': ['stocks', 'mutual', 'fund', 'investment'],
  'Wallet': ['paytm', 'phonepe', 'gpay', 'wallet'],
  'Salary': ['salary', 'income', 'credit'],
  'Other': []
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
    return `${transaction.notes || ''} ${transaction.source_sms || ''} ${transaction.recipient || ''} ${transaction.account || ''} ${transaction.bank || ''}`.toLowerCase();
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

  private ruleBasedCategorization(transaction: Transaction): Category | null {
    const text = this.extractTransactionText(transaction);
    
    // First check learned rules
    for (const rule of this.learnedRules) {
      if (text.includes(rule.pattern.toLowerCase())) {
        rule.lastUsed = Date.now();
        rule.usageCount++;
        return rule.category;
      }
    }
    
    // Then check predefined rules
    for (const [category, keywords] of Object.entries(categoryRules)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category as Category;
      }
    }
    
    return null;
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
    // Try rule-based categorization first
    const ruleBasedCategory = this.ruleBasedCategorization(transaction);
    if (ruleBasedCategory) {
      return { ...transaction, category: ruleBasedCategory };
    }

    // Fall back to ML-based categorization
    const mlCategory = this.mlBasedCategorization(transaction);
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

  private extractPatterns(text: string): string[] {
    const patterns: string[] = [];
    const words = text.split(/\s+/);
    
    // Extract merchant names (capitalized words)
    const merchantWords = words.filter(word => 
      word.length > 2 && 
      word === word.toUpperCase() && 
      !['INR', 'RS', 'DEBIT', 'CREDIT', 'ACCOUNT', 'BALANCE', 'TRANSACTION'].includes(word)
    );
    patterns.push(...merchantWords);

    // Extract common transaction patterns
    const commonPatterns = [
      /(?:at|from|via)\s+([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
      /(?:purchase|payment|transaction)\s+(?:at|from)\s+([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
      /(?:merchant|store|shop):\s*([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
      /(?:UPI|PAYTM|GPAY)\s+(?:to|at)\s+([A-Z][A-Z\s&]+?)(?:\s|$|\.|,)/i,
    ];

    for (const pattern of commonPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length > 2 && extracted.length < 50) {
          patterns.push(extracted);
        }
      }
    }

    return patterns;
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