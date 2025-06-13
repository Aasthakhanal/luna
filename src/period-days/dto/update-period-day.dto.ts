import { PartialType } from '@nestjs/mapped-types';
import { CreatePeriodDayDto } from './create-period-day.dto';

export class UpdatePeriodDayDto extends PartialType(CreatePeriodDayDto) {}
