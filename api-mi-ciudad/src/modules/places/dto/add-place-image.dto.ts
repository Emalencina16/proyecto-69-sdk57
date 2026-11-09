import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AgregarImagenLugarDto {
  @ApiProperty({
    description: 'URL de imagen devuelta por POST /archivos.',
    example: 'http://192.168.0.10:3000/archivos/imagenes/2026/11/abc123.jpg',
  })
  @IsString({ message: 'La imagen no es válida.' })
  @IsNotEmpty({ message: 'La imagen no es válida.' })
  @MaxLength(2000, { message: 'La imagen no es válida.' })
  url: string;
}
