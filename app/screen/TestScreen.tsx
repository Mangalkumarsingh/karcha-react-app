import { TestData } from '@/model/TestData';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';


export default function TestScreen({itemData}:{itemData: TestData}) {
  return (
    <View style={styles.fullItem}>
       <View style={styles.itemHorizantal}>
       {/* 3. Ab itemData.name use karein */}
       <Text>{itemData.name}</Text>
        </View> 
    </View>
  )
}

export const styles = StyleSheet.create({
  fullItem: {
    width: '100%',
    marginHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10 // thoda padding add kiya taaki text chipka na lage
  },
  itemHorizantal: {
    flexDirection: 'row'
  }
});