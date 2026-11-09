import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export const LARGO_MAXIMO_COMENTARIO = 500;
const MENSAJE_COMENTARIO = `El comentario tiene que tener entre 1 y ${LARGO_MAXIMO_COMENTARIO} caracteres.`;

export class AgregarComentarioLugarDto {
  @ApiProperty({ maxLength: LARGO_MAXIMO_COMENTARIO, example: 'Un lugar hermoso para visitar.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: MENSAJE_COMENTARIO })
  @IsNotEmpty({ message: MENSAJE_COMENTARIO })
  @MaxLength(LARGO_MAXIMO_COMENTARIO, { message: MENSAJE_COMENTARIO })
  texto: string;
}
