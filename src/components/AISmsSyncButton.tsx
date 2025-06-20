import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { enhancedAISmsService } from '../services/EnhancedAISmsService';

interface AISmsSyncButtonProps {
  onSyncComplete?: (count: number) => void;
}

export const AISmsSyncButton: React.FC<AISmsSyncButtonProps> = ({ onSyncComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const handleAISync = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setStats(null);

    try {
      console.log('Starting AI SMS sync...');
      
      const result = await enhancedAISmsService.syncTransactionsWithAI();
      
      if (result.success) {
        setStats(result.stats);
        setShowStats(true);
        
        Alert.alert(
          'AI Sync Complete',
          `Successfully processed ${result.count} transactions with AI!\n\nAverage confidence: ${(result.stats.averageConfidence * 100).toFixed(1)}%`,
          [
            { text: 'View Details', onPress: () => setShowStats(true) },
            { text: 'OK', onPress: () => onSyncComplete?.(result.count) }
          ]
        );
      } else {
        Alert.alert('AI Sync Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('AI sync error:', error);
      Alert.alert('Error', 'Failed to sync SMS with AI processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Food & Dining': '#FF9800',
      'Shopping': '#9C27B0',
      'Transportation': '#2196F3',
      'Entertainment': '#E91E63',
      'Bills & Utilities': '#F44336',
      'Health & Fitness': '#00BCD4',
      'Travel': '#795548',
      'Education': '#795548',
      'Personal Care': '#9C27B0',
      'Gifts & Donations': '#4CAF50',
      'Investments': '#FFC107',
      'Wallet': '#2196F3',
      'Salary': '#4CAF50',
      'Other': '#607D8B',
    };
    return colors[category] || '#CCCCCC';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isProcessing && styles.buttonDisabled]}
        onPress={handleAISync}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>🤖 AI Sync SMS</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showStats}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStats(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Processing Statistics</Text>
            
            {stats && (
              <ScrollView style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Processed:</Text>
                  <Text style={styles.statValue}>{stats.totalProcessed}</Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Successful:</Text>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.successful}</Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Failed:</Text>
                  <Text style={[styles.statValue, { color: '#F44336' }]}>{stats.failed}</Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Success Rate:</Text>
                  <Text style={styles.statValue}>
                    {stats.totalProcessed > 0 ? ((stats.successful / stats.totalProcessed) * 100).toFixed(1) : 0}%
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Avg Confidence:</Text>
                  <Text style={styles.statValue}>
                    {(stats.averageConfidence * 100).toFixed(1)}%
                  </Text>
                </View>

                <Text style={styles.categoryTitle}>Categories Found:</Text>
                {Object.entries(stats.categories).map(([category, count]) => (
                  <View key={category} style={styles.categoryRow}>
                    <View style={[styles.categoryColor, { backgroundColor: getCategoryColor(category) }]} />
                    <Text style={styles.categoryName}>{category.replace(/_/g, ' ').toUpperCase()}</Text>
                    <Text style={styles.categoryCount}>{String(count)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowStats(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statsContainer: {
    maxHeight: 400,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});