import { ProductResponse } from "../model/ProductModel";
import { axiosCli } from "./Axiosclient";

 export const getProduct= async (): Promise <ProductResponse>=>{
    const response= await axiosCli.get('/products');
    return response.data;
}