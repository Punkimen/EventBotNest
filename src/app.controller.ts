import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): unknown {
    return this.appService.getHello();
  }

  @Get('cats')
  findAll(@Req() request: Request): string {
    console.log('request', request);
    return 'This action returns all cats';
  }
}
