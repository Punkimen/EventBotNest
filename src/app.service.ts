import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) { }
  getHello(): unknown {
    console.log('process.env', this.configService.get('BOT_API'));
    return `123`;
  }
}
