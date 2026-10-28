import { useEffect, useState } from "react";
import { AppState, DeviceEventEmitter, Pressable, SafeAreaView, Text } from "react-native";
import { View } from "react-native-reanimated/lib/typescript/Animated";

const homeScreen = ( ) => {
    const [appState, setAppState] = useState(AppState.currentState);
useEffect(() => {
    const handleLifeCycle=AppState.addEventListener("change",(nextAppState) =>{
       if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App wapas Foreground mein aa gayi! (onResume)');
      } else if (nextAppState === 'background') {
        console.log('App Background mein chali gayi! (onPause)');
      }
      
      setAppState(nextAppState);
    })
})
}


const variableHolder = () =>{
    const [add,setAdd] =useState(0);


    return (
      <SafeAreaView>
        <Text>{add}</Text>
        <Pressable onPress={() => setAdd(add+1)}>
          <Text>click me</Text>
        </Pressable>
      </SafeAreaView>
    )
}




//broadcasting , DeviceEventEmitter
const broadcastSend = () => {
const sendBroad= DeviceEventEmitter.emit("my_bound",{data:"you open the app"});
}

const broadcastReceiver = () => {
  const [readData,setReadData]=useState();
  const getBroadcast =DeviceEventEmitter.addListener("my_bound" ,(event)=>{
setReadData(event.data);
  })
  return getBroadcast.remove();
}