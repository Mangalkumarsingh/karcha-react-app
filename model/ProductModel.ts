// models/ProductModel.ts

// 1. Ek single product kaisa dikhega
export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
}

// 2. API ka poora response kaisa aayega
export interface ProductResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}