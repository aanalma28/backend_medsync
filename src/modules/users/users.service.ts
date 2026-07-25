import { Injectable } from '@nestjs/common';
import { UserService } from './users.service';

@Injectable()
export class UsersService {
  constructor(private readonly userService: UserService) {}  
}