import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(0)
  availableQuantity: number;
}
