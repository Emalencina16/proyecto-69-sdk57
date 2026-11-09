import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { RespuestaLista, RespuestaUno } from '../../../contract/api.js';
import type { ComentarioLugar } from '../../../contract/comentarios.js';
import type { Lugar } from '../../../contract/types.js';
import { Publico, UsuarioActual, type UsuarioAutenticado } from '../../common/auth/decorators.js';
import { ErrorApi } from '../../common/errors/error-api.js';
import { respuestaLista, respuestaUno } from '../../common/response/response.js';
import { EJEMPLO_LUGAR, ejemploError } from '../../common/swagger/examples.js';
import { ListarLugaresDto } from './dto/list-places.dto.js';
import { AgregarImagenLugarDto } from './dto/add-place-image.dto.js';
import { AgregarComentarioLugarDto } from './dto/add-place-comment.dto.js';
import { PaginacionDto } from '../../common/response/pagination.dto.js';
import { LugaresServicio } from './places.service.js';

@ApiTags('Catálogo')
@Controller('lugares')
export class LugaresControlador {
  constructor(private readonly lugares: LugaresServicio) {}

  @Publico()
  @Get()
  @ApiOperation({
    summary: 'Lugares',
    description:
      'Público. Por nombre, o por distancia con `orden=distancia` y tu ubicación. Sin `actualizadoDesde`, ' +
      'sólo los activos. Los horarios son los de la temporada vigente (verano: 1/12 al 31/3). ' +
      '`porPagina` llega a 500 para guardar el catálogo entero en el teléfono.',
  })
  @ApiResponse({
    status: 200,
    schema: { example: { datos: [EJEMPLO_LUGAR], meta: { total: 27, pagina: 1, porPagina: 20 } } },
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDACION_FALLIDA (por ejemplo, `orden=distancia` sin `latitud` y `longitud`)',
    schema: ejemploError('VALIDACION_FALLIDA'),
  })
  async listar(@Query() consulta: ListarLugaresDto): Promise<RespuestaLista<Lugar>> {
    const { datos, meta } = await this.lugares.listar(consulta);
    return respuestaLista(datos, meta);
  }

  @Publico()
  @Get('qr')
  @ApiExcludeEndpoint()
  /** Un QR vacío (R6): sin esta ruta, `/lugares/qr` caería en el detalle con id `qr`. */
  sinCodigo(): never {
    throw new ErrorApi('QR_NO_RECONOCIDO');
  }

  @Publico()
  @Get('qr/*codigo')
  @ApiOperation({
    summary: 'Lugar de un código QR',
    description:
      'Público. El contenido del QR del cartel, codificado para URL (`encodeURIComponent`). ' +
      'El formato es `COLON:<lugarId>`, por ejemplo `/lugares/qr/COLON%3Alug-004`. ' +
      'Cualquier otra cosa (un QR de otro sistema, una URL, texto roto) da `QR_NO_RECONOCIDO`.',
  })
  @ApiParam({ name: 'codigo', example: 'COLON%3Alug-004' })
  @ApiResponse({ status: 200, schema: { example: { datos: EJEMPLO_LUGAR, meta: null } } })
  @ApiResponse({ status: 404, description: 'QR_NO_RECONOCIDO', schema: ejemploError('QR_NO_RECONOCIDO') })
  async porQr(@Param('codigo') partes: string[] | string): Promise<RespuestaUno<Lugar>> {
    // Si el teléfono no codificó las barras de una URL, llegan como varias partes.
    const codigo = Array.isArray(partes) ? partes.join('/') : partes;
    return respuestaUno(await this.lugares.porQr(codigo));
  }

  @Publico()
  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de un lugar',
    description: 'Público. Devuelve también los dados de baja, con `activo: false`.',
  })
  @ApiParam({ name: 'id', example: 'lug-004' })
  @ApiResponse({ status: 200, schema: { example: { datos: EJEMPLO_LUGAR, meta: null } } })
  @ApiResponse({
    status: 404,
    description: 'LUGAR_NO_ENCONTRADO',
    schema: ejemploError('LUGAR_NO_ENCONTRADO'),
  })
  async detalle(@Param('id') id: string): Promise<RespuestaUno<Lugar>> {
    return respuestaUno(await this.lugares.detalle(id));
  }

  @Publico()
  @Get(':id/comentarios')
  @ApiOperation({
    summary: 'Comentarios de un lugar',
    description: 'Público. Del más nuevo al más antiguo; admite paginación.',
  })
  @ApiParam({ name: 'id', example: 'lug-004' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        datos: [
          {
            id: 'com-abc123def456',
            lugarId: 'lug-004',
            usuarioId: 'usr-201',
            autor: 'Turista',
            texto: 'Un lugar hermoso para visitar.',
            creadoEn: '2026-11-14T17:42:00-03:00',
          },
        ],
        meta: { total: 1, pagina: 1, porPagina: 20 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'LUGAR_NO_ENCONTRADO',
    schema: ejemploError('LUGAR_NO_ENCONTRADO'),
  })
  async listarComentarios(
    @Param('id') id: string,
    @Query() consulta: PaginacionDto,
  ): Promise<RespuestaLista<ComentarioLugar>> {
    const { datos, meta } = await this.lugares.listarComentarios(id, consulta);
    return respuestaLista(datos, meta);
  }

  @Post(':id/comentarios')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Agregar un comentario a un lugar',
    description: 'Con sesión. El comentario se muestra públicamente en el detalle del lugar.',
  })
  @ApiParam({ name: 'id', example: 'lug-004' })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        datos: {
          id: 'com-abc123def456',
          lugarId: 'lug-004',
          usuarioId: 'usr-201',
          autor: 'Turista',
          texto: 'Un lugar hermoso para visitar.',
          creadoEn: '2026-11-14T17:42:00-03:00',
        },
        meta: null,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'VALIDACION_FALLIDA', schema: ejemploError('VALIDACION_FALLIDA') })
  @ApiResponse({ status: 401, description: 'NO_AUTENTICADO', schema: ejemploError('NO_AUTENTICADO') })
  @ApiResponse({
    status: 404,
    description: 'LUGAR_NO_ENCONTRADO',
    schema: ejemploError('LUGAR_NO_ENCONTRADO'),
  })
  async agregarComentario(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: AgregarComentarioLugarDto,
  ): Promise<RespuestaUno<ComentarioLugar>> {
    return respuestaUno(await this.lugares.agregarComentario(id, usuario.id, dto));
  }

  @Post(':id/imagenes')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Agregar una foto a un lugar',
    description:
      'Con sesión. La URL tiene que ser de una imagen cargada previamente con `POST /archivos`. ' +
      'La foto se agrega a la ficha pública del lugar y queda visible para todas las personas.',
  })
  @ApiParam({ name: 'id', example: 'lug-004' })
  @ApiResponse({ status: 201, schema: { example: { datos: EJEMPLO_LUGAR, meta: null } } })
  @ApiResponse({ status: 401, description: 'NO_AUTENTICADO', schema: ejemploError('NO_AUTENTICADO') })
  @ApiResponse({
    status: 404,
    description: 'LUGAR_NO_ENCONTRADO',
    schema: ejemploError('LUGAR_NO_ENCONTRADO'),
  })
  @ApiResponse({
    status: 422,
    description: 'ARCHIVO_NO_SUBIDO',
    schema: ejemploError('ARCHIVO_NO_SUBIDO'),
  })
  async agregarImagen(
    @Param('id') id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: AgregarImagenLugarDto,
  ): Promise<RespuestaUno<Lugar>> {
    return respuestaUno(await this.lugares.agregarImagen(id, usuario.id, dto));
  }
}
