import { Product } from '@/model/ProductModel';
import React from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useProdu } from '../hooks/UseProducts';

export default function BuyLand() {
  // 1. Hook se data extract karein
  const { data, isLoading, isError, error } = useProdu();
//   const appState=useRef(AppState.currentState);
//    useEffect(()=>{

// const sub=AppState.addEventListener('change',(nextAppState)=>{

// if(appState.current.match(/inactive|background/) && nextAppState==='active'){
//   //onResume state
//   console.log('App has come to the foreground!')
// }
//   appState.current=nextAppState;
// });
// return () => sub.remove();
//    },[]);

  // 2. Loading UI
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Products load ho rahe hain...</Text>
      </View>
    );
  }

  // 3. Error UI
  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: 'red' }}>Error: {error?.message || 'Kuch galat ho gaya'}</Text>
      </View>
    );
  }

  // 4. List render karne ka function
  // JSDoc add kiya hai taaki VS Code ko pata chale ki 'item' hamara ProductModel hai
  /** @param {{ item: import('../models/ProductModel').ProductModel }} props */
  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      {/* Ab agar API se thumbnail nahi bhi aayi, toh humara Model crash nahi hone dega */}
      <Image 
        source={{ uri: item.thumbnail || 'https://via.placeholder.com/80' }} 
        style={styles.image} 
      />
      
      <View style={styles.cardInfo}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>${item.price}</Text>
      </View>
    </View>
  );

  // 5. Main UI
  return (
    <View style={styles.container}>
      <FlatList
        data={data?.products || []}
        // id number me aati hai, usko string me convert karna zaroori hai key ke liye
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 10 }}
        // Scroll performance improve karne ke liye ye props add karein:
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eaeaea',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 15, // Thoda extra gap add kiya detail aur image ke beech
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  price: {
    fontSize: 16,
    fontWeight: '600', // Price ko thoda bold kiya
    color: '#007AFF',
    marginTop: 5,
  },
});