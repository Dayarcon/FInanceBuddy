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

### Main Features

#### 1. Transaction Management
- Add new transactions
- View transaction history
- Categorize transactions
- Track income and expenses

#### 2. Bill Management
- Add and track bills
- Monitor overdue bills
- Set up bill reminders
- Track bill payments

#### 3. Credit Card Management
- Track credit card statements
- Monitor credit card bills
- View payment history
- Set up payment reminders

#### 4. Financial Reports
- Generate expense reports
- View spending patterns
- Track financial goals
- Analyze spending categories

#### 5. Data Synchronization
- Comprehensive sync feature
- SMS-based transaction import (Android)
- Manual transaction entry
- Data backup and restore

## Key Components

### Database
The application uses SQLite for local data storage, with tables for:
- Transactions
- Bills
- Credit Card Statements
- Categories
- Settings

### Navigation
The app uses a bottom tab navigation with the following main sections:
- Home
- Transactions
- Bills
- Reports
- Settings

### Screens
1. **Home Screen**: Dashboard with financial overview
2. **Transactions**: List and manage transactions
3. **Bills**: Track and manage bills
4. **Reports**: View financial reports and analytics
5. **Settings**: Configure app preferences
6. **Add Transaction**: Form for adding new transactions
7. **Add Bill**: Form for adding new bills
8. **Credit Card Statements**: View and manage credit card statements
9. **Overdue Bills**: Track overdue payments
10. **Comprehensive Sync**: Data synchronization interface

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

### Bill Tracking
- Add recurring and one-time bills
- Set payment reminders
- Track payment status
- View payment history

### Credit Card Management
- Track multiple credit cards
- Monitor statements
- Set up payment reminders
- View spending patterns

### Financial Reports
- Generate monthly reports
- View spending by category
- Track income vs expenses
- Export report data

### Data Synchronization
- Import transactions from SMS
- Manual transaction entry
- Data backup and restore
- Cross-device synchronization

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

## Contributing
Please read the contribution guidelines before submitting pull requests.

## License
[Add license information here] 