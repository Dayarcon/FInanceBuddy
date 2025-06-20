import { Ionicons } from '@expo/vector-icons';
import { Alert, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { fixIncorrectTransactionTypes, getDBConnection, resetDatabase } from '../services/database';
import { syncSmsTransactionsService } from '../services/smsSyncService';

export default function SettingsScreen() {
  const handleSyncSms = async () => {
    try {
      const success = await syncSmsTransactionsService();
      if (success) {
        Alert.alert("Success", "AI-powered SMS Sync completed");
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
              await resetDatabase();
              Alert.alert("Success", "Database reset successfully");
            } catch (error) {
              console.error('Reset database error:', error);
              Alert.alert("Error", "Failed to reset database");
            }
          }
        }
      ]
    );
  };

  const handleFixTransactions = async () => {
    try {
      const fixedCount = await fixIncorrectTransactionTypes();
      Alert.alert("Success", `Fixed ${fixedCount} incorrectly classified transactions`);
    } catch (error) {
      Alert.alert("Error", "Failed to fix transactions");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>SMS Processing</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleSyncSms}>
          <Ionicons name="sync" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>🤖 Sync SMS with AI</Text>
        </TouchableOpacity>
        <Text style={styles.description}>
          Automatically processes SMS with AI-powered classification and enhanced data extraction
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Database Management</Text>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#FF9800' }]} onPress={handleFixTransactions}>
          <Ionicons name="build" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Fix Transaction Types</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#ff4444', marginTop: 12 }]} onPress={handleResetDatabase}>
          <Ionicons name="trash" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Reset Database</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#222' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  description: { fontSize: 13, color: '#666', marginTop: 8 },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
    borderRadius: 1,
  },
});
