import { Controller, Get, Headers, HttpStatus, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { RuntimeService } from './runtime.service';
import { Throttle } from '@nestjs/throttler';

@Controller('public/forms')
export class PublicRuntimeController {
  constructor(private readonly runtimeService: RuntimeService) {}

  @Get(':publicId')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getPublicForm(
    @Param('publicId') publicId: string,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Headers('if-modified-since') ifModifiedSince: string | undefined,
    @Res() res: Response,
  ) {
    const { dto, etag, lastModified } = await this.runtimeService.getPublicForm(publicId);

    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', lastModified.toUTCString());
    res.setHeader('Cache-Control', 'public, no-cache');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= lastModified.getTime()) {
      return res.status(HttpStatus.NOT_MODIFIED).send();
    }

    return res.status(HttpStatus.OK).json(dto);
  }
}

