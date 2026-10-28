// import { FlatList } from "react-native-reanimated/lib/typescript/Animated";
// import { SafeAreaView } from "react-native-safe-area-context";
// import MultiScreenMerging from "./MultiScreenMerging";

// export interface commonModel{
//     id:number;
//     name: string;
//     salary: number;

// }

// const MainScreen = () => {
// const dataSetFormat:commonModel[]= [
// {
//     id:1,
//     name: "John Doe",
//     salary: 50000,
// },
// {
//     id:2,
//     name: "Jane Smith",
//     salary: 60000,
// },
// ];
// return(
//     <SafeAreaView>

// <FlatList
// data={dataSetFormat}
// renderItem={(item)=> (
//     <MultiScreenMerging  commonModel={item} onPress={()=>console.log("item clicked")} />
// )}
// keyExtractor={(item)=>item.id.toString()}>

// </FlatList>
//     </SafeAreaView>
// )

// }