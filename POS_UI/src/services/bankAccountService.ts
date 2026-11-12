import {request} from '../http/client.ts';

export interface StoreBankAccount {bankBin:string;accountNumber:string;accountName:string}
export const bankAccountService={
  get:()=>request<StoreBankAccount|null>('store-bank-account'),
  update:(input:StoreBankAccount)=>request<StoreBankAccount>('store-bank-account','PATCH',input),
};
