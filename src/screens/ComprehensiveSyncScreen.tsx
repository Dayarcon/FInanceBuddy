import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { manualMatchPaymentsToBills, syncCreditCardData } from '../services/comprehensiveCreditCardSync';
import { syncSmsTransactions } from '../services/smsService';

type SyncResult = {
  type: string;
  success: boolean;
  count: number;
  details?: any;
  error?: string;
};

export default function ComprehensiveSyncScreen() {
  const [loading, setLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const router = useRouter();

  const handleComprehensiveSync = async () => {
    try {
      setLoading(true);
      setSyncResults([]);
      
      const results: SyncResult[] = [];
      
      // 1. Sync general SMS transactions
      console.log('Starting general SMS sync...');
      const generalResult = await syncSmsTransactions();
      results.push({
        type: 'General Transactions',
        success: generalResult.success,
        count: generalResult.count,
        error: generalResult.error
      });
      
      // 2. Sync credit card data (bills and payments)
      console.log('Starting credit card sync...');
      const creditCardResult = await syncCreditCardData();
      results.push({
        type: 'Credit Card Data',
        success: creditCardResult.success,
        count: creditCardResult.billsInserted + creditCardResult.paymentsInserted,
        details: {
          billsFound: creditCardResult.billsFound,
          billsInserted: creditCardResult.billsInserted,
          paymentsFound: creditCardResult.paymentsFound,
          paymentsInserted: creditCardResult.paymentsInserted,
          matchesCreated: creditCardResult.matchesCreated
        },
        error: creditCardResult.error
      });
      
      setSyncResults(results);
      
      const totalTransactions = results.reduce((sum, result) => sum + result.count, 0);
      const successCount = results.filter(r => r.success).length;
      
      if (successCount > 0) {
        Alert.alert(
          'Sync Completed',
          `Found ${totalTransactions} total transactions across ${successCount} categories.`,
          [
            { text: 'View Transactions', onPress: () => router.push('/transactions') },
            { text: 'View Credit Bills', onPress: () => router.push('/credit-card-bills') },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Sync Failed', 'No transactions were found or processed successfully.');
      }
    } catch (error) {
      console.error('Comprehensive sync error:', error);
      Alert.alert('Error', 'Failed to complete sync process');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditCardSync = async () => {
    try {
      setLoading(true);
      const result = await syncCreditCardData();
      
      setSyncResults([{
        type: 'Credit Card Data',
        success: result.success,
        count: result.billsInserted + result.paymentsInserted,
        details: {
          billsFound: result.billsFound,
          billsInserted: result.billsInserted,
          paymentsFound: result.paymentsFound,
          paymentsInserted: result.paymentsInserted,
          matchesCreated: result.matchesCreated
        },
        error: result.error
      }]);
      
      if (result.success) {
        Alert.alert(
          'Credit Card Sync Successful',
          `Found ${result.billsInserted} bills and ${result.paymentsInserted} payments. Created ${result.matchesCreated} matches.`,
          [
            { text: 'View Bills', onPress: () => router.push('/credit-card-bills') },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Credit Card Sync Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Credit card sync error:', error);
      Alert.alert('Error', 'Failed to sync credit card data');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPayments = async () => {
    try {
      setLoading(true);
      const result = await manualMatchPaymentsToBills();
      
      if (result.success) {
        Alert.alert(
          'Matching Complete',
          `Created ${result.matchesCreated} new payment-to-bill matches.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Matching Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Matching error:', error);
      Alert.alert('Error', 'Failed to match payments');
    } finally {
      setLoading(false);
    }
  };

  const renderDetailedResult = (result: SyncResult) => {
    if (result.type === 'Credit Card Data' && result.details) {
      return (
        <View style={styles.detailedResult}>
          <Text style={styles.detailedTitle}>{result.type}</Text>
          <Text style={styles.detailedText}>
            Bills: {result.details.billsFound} found, {result.details.billsInserted} inserted
          </Text>
          <Text style={styles.detailedText}>
            Payments: {result.details.paymentsFound} found, {result.details.paymentsInserted} inserted
          </Text>
          <Text style={styles.detailedText}>
            Matches: {result.details.matchesCreated} created
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>
          {result.type}
        </Text>
        <Text style={styles.resultText}>
          {result.success 
            ? `Found ${result.count} transactions`
            : result.error || 'Failed to sync'
          }
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="sync" size={32} color="#007AFF" />
          <Text style={styles.infoTitle}>Comprehensive SMS Sync</Text>
        </View>
        <Text style={styles.infoDescription}>
          Sync all types of financial SMS messages including transactions, credit card bills, and payments with automatic matching.
        </Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>General bank transactions</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Credit card bill statements</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Bill payment confirmations</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.featureText}>Automatic payment-to-bill matching</Text>
          </View>
        </View>
      </View>

      {/* Sync Options */}
      <View style={styles.syncOptions}>
        <Text style={styles.sectionTitle}>Sync Options</Text>
        
        {/* Comprehensive Sync */}
        <TouchableOpacity
          style={[styles.syncButton, styles.comprehensiveButton, loading && styles.syncButtonDisabled]}
          onPress={handleComprehensiveSync}
          disabled={loading}
        >
          <Ionicons 
            name={loading ? "hourglass" : "sync"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.syncButtonText}>
            {loading ? 'Syncing All...' : 'Sync Everything'}
          </Text>
        </TouchableOpacity>

        {/* Individual Sync Buttons */}
        <View style={styles.individualSyncContainer}>
          <TouchableOpacity
            style={[styles.individualSyncButton, loading && styles.syncButtonDisabled]}
            onPress={handleCreditCardSync}
            disabled={loading}
          >
            <Ionicons name="card" size={20} color="#FF5722" />
            <Text style={styles.individualSyncText}>Credit Card Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.individualSyncButton, loading && styles.syncButtonDisabled]}
            onPress={handleMatchPayments}
            disabled={loading}
          >
            <Ionicons name="link" size={20} color="#9C27B0" />
            <Text style={styles.individualSyncText}>Match Payments</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sync Results */}
      {syncResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.sectionTitle}>Sync Results</Text>
          {syncResults.map((result, index) => (
            <View key={index} style={[
              styles.resultCard,
              result.success ? styles.successCard : styles.errorCard
            ]}>
              <Ionicons 
                name={result.success ? "checkmark-circle" : "alert-circle"} 
                size={24} 
                color={result.success ? "#4CAF50" : "#F44336"} 
              />
              {renderDetailedResult(result)}
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/transactions')}
        >
          <Ionicons name="list" size={20} color="#007AFF" />
          <Text style={styles.actionText}>View Transactions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/credit-card-bills')}
        >
          <Ionicons name="card" size={20} color="#FF5722" />
          <Text style={styles.actionText}>View Credit Bills</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  infoCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  infoDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  syncOptions: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 20,
  },
  comprehensiveButton: {
    backgroundColor: '#007AFF',
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  individualSyncContainer: {
    gap: 12,
  },
  individualSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  individualSyncText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  resultsContainer: {
    margin: 20,
    marginTop: 0,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  successCard: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  resultContent: {
    marginLeft: 12,
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
  },
  detailedResult: {
    marginLeft: 12,
    flex: 1,
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  detailedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  quickActions: {
    flexDirection: 'row',
    margin: 20,
    marginTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
}); 