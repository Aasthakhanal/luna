import { PartialType } from '@nestjs/mapped-types';
import { CreateIrregularityDto } from './create-irregularity.dto';

export class UpdateIrregularityDto extends PartialType(CreateIrregularityDto) {}
