import { Alert } from 'react-native';
import { requestSMSPermissions } from './permissionService';
import { syncSmsTransactions } from './smsService';

export const syncSmsTransactionsService = async () => {
  const permission = await requestSMSPermissions();
  if (!permission) {
    Alert.alert("Permission Denied", "Cannot read SMS without permission.");
    return false;
  }
  
  try {
    const result = await syncSmsTransactions();
    if (result.success) {
      Alert.alert("SMS Sync Completed", `Successfully added ${result.count} transactions.`);
      return true;
    } else {
      Alert.alert("Sync Failed", result.error || "Failed to sync SMS transactions.");
      return false;
    }
  } catch (error) {
    console.error('Sync error:', error);
    Alert.alert("Sync Failed", "Failed to sync SMS transactions.");
    return false;
  }
};
