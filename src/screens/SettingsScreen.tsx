import { Alert, Button, Text, View } from 'react-native';
import { fixIncorrectTransactionTypes, getDBConnection, resetDatabase } from '../services/database';
import { syncSmsTransactionsService } from '../services/smsSyncService';

export default function SettingsScreen() {
  const handleSyncSms = async () => {
    try {
      const success = await syncSmsTransactionsService();
      if (success) {
        Alert.alert("Success", "SMS Sync completed");
      }
    } catch (err) {
      Alert.alert("Failed", "SMS sync failed");
    }
  };

  const handleResetDatabase = () => {
    Alert.alert(
      "Reset Database",
      "This will delete all transactions. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              resetDatabase();
              Alert.alert("Success", "Database reset successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to reset database");
            }
          }
        }
      ]
    );
  };

  const handleFixTransactions = async () => {
    try {
      const db = await getDBConnection();
      const fixedCount = fixIncorrectTransactionTypes(db);
      Alert.alert("Success", `Fixed ${fixedCount} incorrectly classified transactions`);
    } catch (error) {
      Alert.alert("Error", "Failed to fix transactions");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Settings</Text>
      <Button title="Sync SMS Transactions" onPress={handleSyncSms} />
      <View style={{ marginTop: 20 }}>
        <Button 
          title="Fix Transaction Types" 
          onPress={handleFixTransactions}
          color="#FF9800"
        />
      </View>
      <View style={{ marginTop: 20 }}>
        <Button 
          title="Reset Database" 
          onPress={handleResetDatabase}
          color="#ff4444"
        />
      </View>
    </View>
  );
}
