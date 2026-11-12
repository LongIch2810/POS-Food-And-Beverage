import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { StoreBankAccountDto } from './http/payment.dto';

@Injectable()
export class StoreBankAccountService {
  constructor(private readonly db:DataSource){}

  async get(user:UserSummary) {
    if(!user.storeId)throw httpError(403,'PERMISSION_DENIED','Không có quyền truy cập dữ liệu vận hành.');
    const [row]=await this.db.query('SELECT bank_bin,account_number,account_name FROM store_bank_accounts WHERE store_id=$1',[user.storeId]);
    return row?{bankBin:row.bank_bin,accountNumber:row.account_number,accountName:row.account_name}:null;
  }

  async update(user:UserSummary,input:StoreBankAccountDto) {
    if(!user.storeId)throw httpError(403,'PERMISSION_DENIED','Không có quyền truy cập dữ liệu vận hành.');
    return this.db.transaction(async manager=>{
      await manager.query('SELECT id FROM stores WHERE id=$1 FOR UPDATE',[user.storeId]);
      const pending=await manager.query(`SELECT id FROM transfer_attempts WHERE store_id=$1 AND status='PENDING' LIMIT 1`,[user.storeId]);
      if(pending.length)throw httpError(409,'TRANSFER_PENDING','Cửa hàng còn mã QR đang chờ thanh toán.');
      await manager.query(`INSERT INTO store_bank_accounts(store_id,bank_bin,account_number,account_name)
        VALUES($1,$2,$3,$4) ON CONFLICT(store_id) DO UPDATE SET bank_bin=$2,account_number=$3,account_name=$4,updated_at=now()`,
        [user.storeId,input.bankBin,input.accountNumber,input.accountName]);
      return {bankBin:input.bankBin,accountNumber:input.accountNumber,accountName:input.accountName};
    });
  }
}
