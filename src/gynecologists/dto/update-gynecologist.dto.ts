import { PartialType } from '@nestjs/mapped-types';
import { CreateGynecologistDto } from './create-gynecologist.dto';

export class UpdateGynecologistDto extends PartialType(CreateGynecologistDto) {}
