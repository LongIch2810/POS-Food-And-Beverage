import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserSummary } from '../auth/auth.service';
import { httpError } from '../http/http-error';
import { Store } from '../platform/entities/store.entity';
import { StoreBankAccount } from './entities/store-bank-account.entity';
import { TransferAttempt } from './entities/transfer-attempt.entity';
import { StoreBankAccountDto } from './http/payment.dto';

@Injectable()
export class StoreBankAccountService {
  constructor(private readonly db:DataSource){}

  async get(user:UserSummary) {
    if(!user.storeId)throw httpError(403,'PERMISSION_DENIED','Không có quyền truy cập dữ liệu vận hành.');
    const row=await this.db.getRepository(StoreBankAccount).findOne({where:{store_id:user.storeId},select:{store_id:true,bank_bin:true,account_number:true,account_name:true}});
    return row?{bankBin:row.bank_bin,accountNumber:row.account_number,accountName:row.account_name}:null;
  }

  async update(user:UserSummary,input:StoreBankAccountDto) {
    if(!user.storeId)throw httpError(403,'PERMISSION_DENIED','Không có quyền truy cập dữ liệu vận hành.');
    return this.db.transaction(async manager=>{
      await manager.getRepository(Store).findOne({where:{id:user.storeId!},select:{id:true},lock:{mode:'pessimistic_write'}});
      const pending=await manager.getRepository(TransferAttempt).existsBy({store_id:user.storeId!,status:'PENDING'});
      if(pending)throw httpError(409,'TRANSFER_PENDING','Cửa hàng còn mã QR đang chờ thanh toán.');
      await manager.getRepository(StoreBankAccount).upsert({store_id:user.storeId!,bank_bin:input.bankBin,account_number:input.accountNumber,account_name:input.accountName,updated_at:()=> 'now()'},['store_id']);
      return {bankBin:input.bankBin,accountNumber:input.accountNumber,accountName:input.accountName};
    });
  }
}
