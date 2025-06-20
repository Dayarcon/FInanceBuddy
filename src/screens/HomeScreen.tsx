import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { fetchTransactions } from '../services/transactionService';

const HomeScreen = () => {
  const router = useRouter();
  const userName = 'User'; // Replace with actual user name if available

  // Placeholder for recent activity
  const recentActivity = [];

  // 1. Accent color
  const ACCENT = '#2563eb';

  // 2. Stat cards (dynamic for transactions)
  const [transactionCount, setTransactionCount] = useState(0);
  useEffect(() => {
    fetchTransactions().then(txns => setTransactionCount(txns.length));
  }, []);
  const statCards = [
    { label: 'Total Balance', value: '₹0.00', icon: 'wallet', color: ACCENT },
    { label: 'Bills', value: '0', icon: 'card', color: '#ef4444' },
    { label: 'Transactions', value: transactionCount.toString(), icon: 'list', color: '#10b981' },
  ];

  const StatCard = ({ label, value, icon, color }) => (
    <View style={{ backgroundColor: color + '11', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 28, marginRight: 14, alignItems: 'center', minWidth: 120 }}>
      <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 6 }} />
      <Text style={{ fontSize: 22, fontWeight: 'bold', color }}>{value}</Text>
      <Text style={{ fontSize: 14, color: '#444', marginTop: 4 }}>{label}</Text>
    </View>
  );

  // 3. Quick actions as horizontal pills
  const quickActions = [
    { label: 'View Bills', icon: 'card-outline', color: ACCENT, route: '/bills' },
    { label: 'Overdue Bills', icon: 'warning-outline', color: '#ef4444', route: '/overdue-bills' },
    { label: 'Add Bill', icon: 'add-circle-outline', color: '#10b981', route: '/add-bill' },
    { label: 'Transactions', icon: 'list', color: ACCENT, route: '/transactions' },
    { label: 'Add Transaction', icon: 'add', color: '#10b981', route: '/add-transaction' },
    { label: 'Reports', icon: 'bar-chart', color: '#a21caf', route: '/reports' },
    { label: 'Sync SMS', icon: 'sync', color: ACCENT, route: '/comprehensive-sync' },
    { label: 'Credit Card Bills', icon: 'card', color: '#f59e42', route: '/credit-card-bills' },
    { label: 'Credit Card Statements', icon: 'document-text', color: '#a21caf', route: '/credit-card-statements' },
  ];

  const ActionPill = ({ icon, label, color, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ backgroundColor: color + '11', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, marginRight: 12, alignItems: 'center', flexDirection: 'row', minWidth: 120 }}>
      <Ionicons name={icon} size={20} color={color} style={{ marginRight: 8 }} />
      <Text style={{ color, fontWeight: '600', fontSize: 15 }}>{label}</Text>
    </TouchableOpacity>
  );

  // 4. Emoji empty state for recent activity
  const EmojiEmpty = ({ emoji, text, cta, onPress }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</Text>
      <Text style={{ fontSize: 16, color: '#888', marginBottom: 12 }}>{text}</Text>
      {cta && <TouchableOpacity style={{ backgroundColor: ACCENT, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }} onPress={onPress}><Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{cta}</Text></TouchableOpacity>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ paddingTop: 48, paddingBottom: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={{ uri: 'https://i.pravatar.cc/100?img=3' }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 14, borderWidth: 2, borderColor: '#fff' }} />
          <View>
            <Text style={{ fontSize: 16, color: '#888' }}>Welcome back,</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222' }}>{userName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={{ backgroundColor: ACCENT + '11', borderRadius: 16, padding: 10 }}>
          <Ionicons name="settings-outline" size={26} color={ACCENT} />
        </TouchableOpacity>
      </View>
      {/* Stat Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, paddingLeft: 16 }}>
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </ScrollView>
      {/* Quick Actions */}
      <Text style={{ fontSize: 18, fontWeight: '600', color: ACCENT, marginLeft: 18, marginBottom: 8 }}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, paddingLeft: 16 }}>
        {quickActions.map((action) => (
          <ActionPill key={action.label} icon={action.icon} label={action.label} color={action.color} onPress={() => router.push(action.route)} />
        ))}
      </ScrollView>
      {/* Recent Activity */}
      <Text style={{ fontSize: 18, fontWeight: '600', color: ACCENT, marginLeft: 18, marginBottom: 8 }}>Recent Activity</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18, paddingLeft: 16 }}>
        {recentActivity.length === 0 ? (
          <EmojiEmpty emoji="🕒" text="No recent activity" cta="Add Transaction" onPress={() => router.push('/add-transaction')} />
        ) : (
          recentActivity.map((activity, idx) => (
            <View key={idx} style={{ backgroundColor: '#f3f4f6', borderRadius: 18, padding: 18, marginRight: 14, minWidth: 180, alignItems: 'flex-start' }}>
              {/* Render activity details here */}
            </View>
          ))
        )}
      </ScrollView>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={{ position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 8 }}
        onPress={() => router.push('/add-transaction')}
        activeOpacity={0.85}
        accessibilityLabel="Add Transaction"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
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