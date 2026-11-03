import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api, { clearAccessToken, getAccessToken, initToken, setAccessToken } from './client.ts';

export { clearAccessToken, getAccessToken, initToken, setAccessToken };
export default api;
