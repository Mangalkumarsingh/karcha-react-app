import { getProduct } from "../api/ProductApi";

import { useQuery } from '@tanstack/react-query';

export   const useProdu=()=>{
    return useQuery({
        queryKey:['products'],
        queryFn:getProduct
    })
};