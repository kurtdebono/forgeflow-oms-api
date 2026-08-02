import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class ReserveStockDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
