import { Transform, TransformFnParams } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const PAGE_MAX = 2147483647;
export const LIMIT_MAX = 100;

// Strict: only plain decimal digits become numbers. Everything else (arrays from
// repeated params, '', '1.5', '0x10', '1e1', ' 1') stays as-is and fails @IsInt -> 400.
const toStrictInt = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

export class PaginationQueryDto {
  @Transform(toStrictInt)
  @IsInt()
  @Min(1)
  @Max(PAGE_MAX)
  page: number = 1;

  @Transform(toStrictInt)
  @IsInt()
  @Min(1)
  @Max(LIMIT_MAX)
  limit: number = 20;
}
