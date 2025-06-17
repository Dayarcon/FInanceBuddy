import AsyncStorage from '@react-native-async-storage/async-storage';
import { NaiveBayes } from 'ml-naivebayes';
import natural from 'natural';

// Define transaction types
export interface Transaction {
  description: string;
  vpa?: string;
  amount: number;
  merchant?: string;
  category?: string;
}

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
  | 'Other';

// Rule-based categorization keywords
const categoryRules: Record<Category, string[]> = {
  'Food & Dining': ['zomato', 'swiggy', 'food', 'restaurant', 'cafe', 'coffee'],
  'Shopping': ['amazon', 'flipkart', 'myntra', 'shop', 'store', 'retail'],
  'Transportation': ['uber', 'ola', 'metro', 'bus', 'train', 'fuel', 'petrol', 'diesel'],
  'Entertainment': ['netflix', 'prime', 'hotstar', 'movie', 'theatre'],
  'Bills & Utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'broadband'],
  'Health & Fitness': ['pharmacy', 'hospital', 'doctor', 'gym', 'fitness'],
  'Travel': ['flight', 'hotel', 'booking', 'trip', 'travel'],
  'Education': ['course', 'school', 'college', 'university', 'training'],
  'Personal Care': ['salon', 'spa', 'beauty', 'cosmetics'],
  'Gifts & Donations': ['gift', 'donation', 'charity'],
  'Investments': ['stocks', 'mutual', 'fund', 'investment'],
  'Wallet': ['paytm', 'phonepe', 'gpay', 'wallet'],
  'Other': []
};

class TransactionCategorizer {
  private classifier: NaiveBayes;
  private tokenizer: natural.WordTokenizer;
  private storageKey = '@transaction_categories';

  constructor() {
    this.classifier = new NaiveBayes();
    this.tokenizer = new natural.WordTokenizer();
    this.initializeClassifier();
  }

  private async initializeClassifier() {
    try {
      const savedData = await AsyncStorage.getItem(this.storageKey);
      if (savedData) {
        const { trainingData } = JSON.parse(savedData);
        this.trainClassifier(trainingData);
      }
    } catch (error) {
      console.error('Error initializing classifier:', error);
    }
  }

  private trainClassifier(trainingData: { text: string; category: Category }[]) {
    trainingData.forEach(({ text, category }) => {
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      this.classifier.train(tokens, category);
    });
  }

  private async saveTrainingData(trainingData: { text: string; category: Category }[]) {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify({ trainingData }));
    } catch (error) {
      console.error('Error saving training data:', error);
    }
  }

  private ruleBasedCategorization(transaction: Transaction): Category | null {
    const text = `${transaction.description} ${transaction.vpa || ''} ${transaction.merchant || ''}`.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryRules)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category as Category;
      }
    }
    
    return null;
  }

  private mlBasedCategorization(transaction: Transaction): Category {
    const text = `${transaction.description} ${transaction.vpa || ''} ${transaction.merchant || ''}`;
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    return this.classifier.predict(tokens) as Category;
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
    const text = `${transaction.description} ${transaction.vpa || ''} ${transaction.merchant || ''}`;
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    // Update the classifier with the correction
    this.classifier.train(tokens, correctedCategory);

    // Save the updated training data
    const savedData = await AsyncStorage.getItem(this.storageKey);
    const trainingData = savedData ? JSON.parse(savedData).trainingData : [];
    trainingData.push({ text, category: correctedCategory });
    await this.saveTrainingData(trainingData);
  }
}

// Export a singleton instance
export const transactionCategorizer = new TransactionCategorizer(); 