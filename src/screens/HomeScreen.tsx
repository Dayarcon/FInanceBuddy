import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Pressable,
} from 'react-native';
// @ts-ignore
import { LinearGradient } from 'expo-linear-gradient';

const HomeScreen = () => {
  const router = useRouter();
  const userName = 'User'; // Replace with actual user name if available

  // Placeholder for recent activity
  const recentActivity = [];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={["#e0e7ff", "#fff"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/100?img=3' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/bills')}
          >
            <Ionicons name="card-outline" size={28} color="#007AFF" />
            <Text style={styles.actionText}>View Bills</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/overdue-bills')}
          >
            <Ionicons name="warning-outline" size={28} color="#FF3B30" />
            <Text style={styles.actionText}>Overdue Bills</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('add-bill' as any)}
          >
            <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
            <Text style={styles.actionText}>Add Bill</Text>
          </Pressable>
        </View>
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/transactions')}
          >
            <Ionicons name="list" size={28} color="#007AFF" />
            <Text style={styles.actionText}>View Transactions</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/add-transaction')}
          >
            <Ionicons name="add" size={28} color="#4CAF50" />
            <Text style={styles.actionText}>Add Transaction</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/reports')}
          >
            <Ionicons name="bar-chart" size={28} color="#9C27B0" />
            <Text style={styles.actionText}>Reports</Text>
          </Pressable>
        </View>
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/comprehensive-sync')}
          >
            <Ionicons name="sync" size={28} color="#007AFF" />
            <Text style={styles.actionText}>Sync SMS</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/credit-card-bills')}
          >
            <Ionicons name="card" size={28} color="#FF5722" />
            <Text style={styles.actionText}>Credit Card Bills</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={() => router.push('/credit-card-statements')}
          >
            <Ionicons name="document-text" size={28} color="#9C27B0" />
            <Text style={styles.actionText}>Credit Card Statements</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityList}>
          {recentActivity.length === 0 ? (
            <>
              <View style={styles.activityCardPlaceholder} />
              <View style={styles.activityCardPlaceholder} />
              <View style={styles.activityCardPlaceholder} />
              <Text style={styles.emptyText}>No recent activity</Text>
            </>
          ) : (
            // Map recentActivity to cards here
            recentActivity.map((activity, idx) => (
              <View key={idx} style={styles.activityCard}>
                {/* Render activity details */}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerGradient: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#fff',
  },
  greeting: {
    fontSize: 16,
    color: '#888',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 18,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    transform: [{ scale: 1 }],
  },
  actionButtonPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: '#F0F0F0',
  },
  actionText: {
    marginTop: 10,
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 1,
  },
  activityList: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 0,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  activityCardPlaceholder: {
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    height: 32,
    width: '90%',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  settingsButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});

export default HomeScreen; 