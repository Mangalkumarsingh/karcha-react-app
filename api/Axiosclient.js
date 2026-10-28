import axios from 'axios';

 export const axiosCli=axios.create({
baseURL: 'https://dummyjson.com',
  headers: {
    'Content-Type': 'application/json',
  },
});