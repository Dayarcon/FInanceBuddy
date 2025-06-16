import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, addMonths, addYears } from 'date-fns';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: Date;
  isRecurring: boolean;
  frequency?: 'monthly' | 'weekly' | 'yearly';
  category: string;
  isPaid: boolean;
  lastPaidDate?: Date;
  isCreditCard?: boolean;
  bankName?: string;
  cardNumber?: string;
  statementDate?: Date;
  paymentDueDate?: Date;
  minimumPayment?: number;
  totalBalance?: number;
}

const BILLS_STORAGE_KEY = '@bills';

class BillService {
  async getBills(): Promise<Bill[]> {
    try {
      const billsJson = await AsyncStorage.getItem(BILLS_STORAGE_KEY);
      if (!billsJson) return [];
      
      const bills = JSON.parse(billsJson);
      return bills.map((bill: any) => ({
        ...bill,
        dueDate: new Date(bill.dueDate),
        lastPaidDate: bill.lastPaidDate ? new Date(bill.lastPaidDate) : undefined,
      }));
    } catch (error) {
      console.error('Error getting bills:', error);
      return [];
    }
  }

  private async saveBills(bills: Bill[]): Promise<void> {
    try {
      await AsyncStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
    } catch (error) {
      console.error('Error saving bills:', error);
    }
  }

  async addBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
    const bills = await this.getBills();
    const newBill: Bill = {
      ...bill,
      id: Date.now().toString(),
    };
    
    bills.push(newBill);
    await this.saveBills(bills);
    return newBill;
  }

  async updateBill(bill: Bill): Promise<void> {
    const bills = await this.getBills();
    const index = bills.findIndex((b) => b.id === bill.id);
    
    if (index !== -1) {
      bills[index] = bill;
      await this.saveBills(bills);
    }
  }

  async deleteBill(id: string): Promise<void> {
    const bills = await this.getBills();
    const filteredBills = bills.filter((bill) => bill.id !== id);
    await this.saveBills(filteredBills);
  }

  async markBillAsPaid(id: string): Promise<void> {
    const bills = await this.getBills();
    const bill = bills.find((b) => b.id === id);
    
    if (bill) {
      bill.isPaid = true;
      bill.lastPaidDate = new Date();
      
      if (bill.isRecurring) {
        // Create next bill instance
        const nextDueDate = this.calculateNextDueDate(bill);
        const nextBill: Bill = {
          ...bill,
          id: Date.now().toString(),
          dueDate: nextDueDate,
          isPaid: false,
          lastPaidDate: undefined,
        };
        bills.push(nextBill);
      }
      
      await this.saveBills(bills);
    }
  }

  private calculateNextDueDate(bill: Bill): Date {
    const { dueDate, frequency } = bill;
    
    switch (frequency) {
      case 'weekly':
        return addDays(dueDate, 7);
      case 'monthly':
        return addMonths(dueDate, 1);
      case 'yearly':
        return addYears(dueDate, 1);
      default:
        return dueDate;
    }
  }

  async getUpcomingBills(days: number = 7): Promise<Bill[]> {
    const bills = await this.getBills();
    const today = new Date();
    const futureDate = addDays(today, days);
    
    return bills
      .filter((bill) => !bill.isPaid && bill.dueDate >= today && bill.dueDate <= futureDate)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async getBillsByCategory(category: string): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter((bill) => bill.category === category);
  }

  async getBillsByStatus(isPaid: boolean): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter((bill) => bill.isPaid === isPaid);
  }

  async getCreditCardBills(): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter(bill => bill.isCreditCard);
  }

  async getRegularBills(): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter(bill => !bill.isCreditCard);
  }

  async getBillsByBank(bankName: string): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter(bill => bill.bankName === bankName);
  }

  async getPaidBills(): Promise<Bill[]> {
    const bills = await this.getBills();
    return bills.filter(bill => bill.isPaid);
  }
}

export const billService = new BillService(); 