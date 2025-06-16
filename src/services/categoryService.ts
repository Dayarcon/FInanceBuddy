export type CustomCategoryRule = {
  id: string;
  sender: string;
  category: string;
};

export type CategoryDefinition = {
  name: string;
  keywords: string[];
  color: string;
  icon: string;
};

export const categoryDefinitions: CategoryDefinition[] = [
  {
    name: 'Salary',
    keywords: ['salary', 'payroll', 'income', 'credited', 'deposited'],
    color: '#4CAF50',
    icon: 'cash'
  },
  {
    name: 'Groceries',
    keywords: ['grocery', 'supermarket', 'food', 'vegetables', 'fruits', 'milk', 'bread', 'rice', 'dal'],
    color: '#FF9800',
    icon: 'basket'
  },
  {
    name: 'Bills',
    keywords: ['bill', 'electricity', 'water', 'gas', 'internet', 'mobile', 'phone', 'recharge', 'prepaid', 'postpaid'],
    color: '#F44336',
    icon: 'receipt'
  },
  {
    name: 'Shopping',
    keywords: ['shopping', 'mall', 'store', 'clothes', 'shoes', 'electronics', 'amazon', 'flipkart', 'myntra'],
    color: '#9C27B0',
    icon: 'bag-handle'
  },
  {
    name: 'Transport',
    keywords: ['fuel', 'petrol', 'diesel', 'uber', 'ola', 'taxi', 'bus', 'metro', 'train'],
    color: '#2196F3',
    icon: 'car'
  },
  {
    name: 'Entertainment',
    keywords: ['movie', 'cinema', 'restaurant', 'cafe', 'hotel', 'booking', 'netflix', 'spotify'],
    color: '#E91E63',
    icon: 'game-controller'
  },
  {
    name: 'Healthcare',
    keywords: ['medical', 'hospital', 'pharmacy', 'medicine', 'doctor', 'clinic'],
    color: '#00BCD4',
    icon: 'medical'
  },
  {
    name: 'Education',
    keywords: ['school', 'college', 'university', 'course', 'training', 'books', 'stationery'],
    color: '#795548',
    icon: 'school'
  }
];

// Default custom rules
export const defaultCustomRules: CustomCategoryRule[] = [
  { id: '1', sender: 'haloforge', category: 'Salary' },
  { id: '2', sender: 'blinkit', category: 'Groceries' },
  { id: '3', sender: 'swiggy', category: 'Entertainment' },
  { id: '4', sender: 'zomato', category: 'Entertainment' },
  { id: '5', sender: 'amazon', category: 'Shopping' },
  { id: '6', sender: 'flipkart', category: 'Shopping' },
];

export const categorizeTransaction = (
  transaction: any, 
  customRules: CustomCategoryRule[] = defaultCustomRules
): string => {
  const smsText = (transaction.source_sms || transaction.notes || '').toLowerCase();
  const recipient = (transaction.recipient || '').toLowerCase();
  const account = (transaction.account || '').toLowerCase();
  
  const allText = `${smsText} ${recipient} ${account}`;

  // First check custom rules
  for (const rule of customRules) {
    if (allText.includes(rule.sender.toLowerCase())) {
      return rule.category;
    }
  }

  // Then check category definitions
  for (const categoryDef of categoryDefinitions) {
    for (const keyword of categoryDef.keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        return categoryDef.name;
      }
    }
  }

  // Default categorization based on transaction type
  if (transaction.type === 'credit') {
    return 'Salary';
  }
  
  return 'Other';
};

export const getCategoryDefinition = (categoryName: string): CategoryDefinition => {
  return categoryDefinitions.find(def => def.name === categoryName) || 
         { name: 'Other', color: '#607D8B', icon: 'help-circle', keywords: [] };
}; 