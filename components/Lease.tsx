import { Color } from '@/src/constants/color';
import { Strings } from '@/src/constants/strings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


type ExpenseItem = {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
};

export default function Lease() {
  const router = useRouter();
  
  // 1. State variables (Data aur Total Balance ke liye)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  // 2. Data load karne ka function
  const loadExpenses = async () => {
    try {
      const storedData = await AsyncStorage.getItem('expenses');
      if (storedData !== null) {
        // YAHAN BADLAAV HAI: Humne TypeScript ko bataya ki ye kis type ka data hai
        const parsedData = JSON.parse(storedData) as ExpenseItem[];
        
        setExpenses(parsedData);
        
        let total = 0;
        // Ab TypeScript apne aap samajh jayega ki 'item' ek ExpenseItem hai
        parsedData.forEach(item => {
          total = total + item.amount;
        });
        setTotalBalance(total);
      }
    } catch (error) {
      console.log("Data load karne me error: ", error);
    }
  };

  // 3. Jaise hi user is screen par aaye, data refresh karo
  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  // 4. Ek kharcha UI me kaisa dikhega (List Item Design)
  const renderExpenseItem = ({ item }: { item: ExpenseItem }) => (
    <TouchableOpacity 
      style={styles.expenseCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/ExpenseDetail?id=${item.id}`)}
    >
      <View>
        <Text style={styles.expenseTitle}>{item.title}</Text>
        {/* Date ko thoda chota dikhaya hai */}
        <Text style={styles.expenseDate}>{new Date(item.date).toDateString()}</Text>
      </View>
      <Text style={styles.expenseAmount}>- ₹ {item.amount}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header / Total Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>{Strings.total_karcha}</Text>
        <Text style={styles.balanceAmount}>₹ {totalBalance}</Text>
      </View>

      <Text style={styles.sectionTitle}>{Strings.recent_karcha}</Text>

      {/* 5. FlatList - Ye automatically hazaron items handle kar legi */}
      {expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: '#888' }}>{Strings.abh_recent_karcha}</Text>
        </View>
      ) : (
        <FlatList
          data={expenses} // Data kahan se aayega
          keyExtractor={(item) => item.id} // Har item ki unique ID
          renderItem={renderExpenseItem} // Design kaisa hoga
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => router.push('/AddExpense')} 
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 20,
  },
  balanceCard: {
    backgroundColor: Color.buttonColor,
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
  },
  balanceTitle: {
    color: '#D1E8FF',
    fontSize: 16,
    marginBottom: 5,
  },
  balanceAmount: {
    color: Color.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* -- Naye UI Styles (List Item ke liye) -- */
  expenseCard: {
    backgroundColor: Color.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2, // shadow
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  expenseDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Color.redColor, // Red color kyunki kharcha hai
  },
  /* -- FAB Styles (Same as before) -- */
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: Color.buttonColor,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: Color.white,
    fontWeight: '300',
    marginTop: -4,
  }
});