import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  BillsStack: NavigatorScreenParams<BillsStackParamList>;
  OverdueBills: undefined;
  Transactions: undefined;
  Reports: undefined;
  ComprehensiveSync: undefined;
  CreditCardBills: undefined;
  CreditCardStatements: undefined;
  AddTransaction: undefined;
};

export type BillsStackParamList = {
  Bills: undefined;
  AddBill: undefined;
  OverdueBills: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
} 