# My Personal Finance Expo - Project Documentation

## Project Overview
My Personal Finance Expo is a React Native mobile application built using Expo framework for managing personal finances. The application helps users track their expenses, manage bills, monitor credit card statements, and generate financial reports.

## Technology Stack
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Database**: SQLite (expo-sqlite)
- **Navigation**: React Navigation
- **UI Components**: Expo Vector Icons, React Native Chart Kit
- **State Management**: React Hooks
- **Storage**: AsyncStorage
- **Additional Features**: 
  - SMS Reading (Android)
  - Notifications
  - Date/Time Picker
  - Charts and Graphs
  - UPI Transaction Parser

## Project Structure

### Root Directory
- `app/` - Main application screens and routing
- `src/` - Core application code
- `assets/` - Static assets and images
- `constants/` - Application constants
- `hooks/` - Custom React hooks
- `scripts/` - Utility scripts

### Source Code Organization (`src/`)
- `database/` - Database schema and operations
- `hooks/` - Custom React hooks
- `navigation/` - Navigation configuration
- `repositories/` - Data access layer
- `screens/` - Screen components
- `services/` - Business logic and services
- `types/` - TypeScript type definitions
- `utils/` - Utility functions including UPI parser

### Main Features

#### 1. Transaction Management
- Add new transactions
- View transaction history
- Categorize transactions
- Track income and expenses
- Automatic UPI transaction parsing
- Distinguish between credit card and normal payments

#### 2. Bill Management
- Add and track bills
- Monitor overdue bills
- Set up bill reminders
- Track bill payments
- Automatic credit card bill payment detection

#### 3. Credit Card Management
- Track credit card statements
- Monitor credit card bills
- View payment history
- Set up payment reminders
- Automatic credit card payment detection from UPI transactions

#### 4. Financial Reports
- Generate expense reports
- View spending patterns
- Track financial goals
- Analyze spending categories
- Separate credit card and normal payment reports

#### 5. Data Synchronization
- Comprehensive sync feature
- SMS-based transaction import (Android)
- Manual transaction entry
- Data backup and restore
- UPI transaction parsing and categorization

## UPI Transaction Parser

### Overview
The UPI Transaction Parser is a utility that automatically parses and categorizes UPI transaction messages from SMS. It can distinguish between credit card bill payments and normal payments, making it easier to track and manage different types of transactions.

### Features
1. **Transaction Parsing**
   - Extracts amount, date, time, VPA, reference number, and bank details
   - Handles various UPI message formats
   - Robust error handling

2. **Payment Type Detection**
   - Identifies credit card bill payments
   - Recognizes normal merchant payments
   - Supports multiple bank and merchant VPAs

3. **Transaction Categorization**
   - Automatically categorizes transactions
   - Groups transactions by payment type
   - Provides merchant/bank information

### Supported Payment Types
1. **Credit Card Bill Payments**
   - Axis Bank
   - HDFC Bank
   - ICICI Bank
   - Kotak Bank
   - SBI
   - IDFC Bank
   - Yes Bank
   - Citi Bank
   - American Express
   - HSBC Bank
   - RBL Bank
   - Standard Chartered

2. **Normal Payments**
   - Paytm
   - PhonePe
   - Google Pay
   - Amazon Pay
   - Axis Bank UPI
   - Other UPI payments

### Usage Example
```typescript
import { parseUPIMessage, parseMultipleUPIMessages, groupTransactionsByType } from '../utils/upiParser';

// Parse a single message
const message = "Rs 546.00 debited via UPI on 31-05-2025 21:08:59 to VPA paytmqr177zry6st7@paytm.Ref No 551731379635.Small txns?Use UPI Lite!-Federal Bank";
const transaction = parseUPIMessage(message);

// Parse multiple messages
const messages = [message1, message2, message3];
const transactions = parseMultipleUPIMessages(messages);

// Group transactions by type
const grouped = groupTransactionsByType(transactions);
console.log('Credit Card Payments:', grouped.creditCardPayments);
console.log('Normal Payments:', grouped.normalPayments);
```

### Transaction Object Structure
```typescript
interface UPITransaction {
  amount: number;
  date: Date;
  time: string;
  vpa: string;
  refNo: string;
  bank: string;
  type: 'DEBIT' | 'CREDIT';
  paymentType: 'CREDIT_CARD_BILL' | 'NORMAL_PAYMENT';
  merchantName?: string;
}
```

## Development Setup

### Prerequisites
- Node.js
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

### Available Scripts
- `npm start`: Start the Expo development server
- `npm run android`: Run on Android device/emulator
- `npm run ios`: Run on iOS simulator
- `npm run web`: Run in web browser

## Features and Functionality

### Transaction Management
- Add transactions with categories
- View transaction history
- Filter and search transactions
- Export transaction data
- Automatic UPI transaction parsing
- Credit card payment detection

### Bill Tracking
- Add recurring and one-time bills
- Set payment reminders
- Track payment status
- View payment history
- Automatic credit card bill detection

### Credit Card Management
- Track multiple credit cards
- Monitor statements
- Set up payment reminders
- View spending patterns
- Automatic payment detection

### Financial Reports
- Generate monthly reports
- View spending by category
- Track income vs expenses
- Export report data
- Separate credit card and normal payment reports

### Data Synchronization
- Import transactions from SMS
- Manual transaction entry
- Data backup and restore
- Cross-device synchronization
- UPI transaction parsing

## Security and Privacy
- Local data storage
- Secure data handling
- Optional SMS permissions
- Data encryption

## Future Enhancements
- Cloud synchronization
- Budget planning
- Investment tracking
- Tax reporting
- Multi-currency support
- Additional payment type detection
- Enhanced merchant recognition

## Contributing
Please read the contribution guidelines before submitting pull requests.

## License
[Add license information here] 