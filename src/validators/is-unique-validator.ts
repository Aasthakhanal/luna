import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Injectable, BadRequestException } from '@nestjs/common';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const [model, field, ignoreIdField] = args.constraints as [
      string,
      string,
      string?,
    ];

    const ignoreId = ignoreIdField
      ? (args.object as Record<string, unknown>)[ignoreIdField]
      : null;

    const whereClause = {
      [field]: value,
      ...(ignoreId ? { NOT: { id: ignoreId } } : {}),
    };

    const record = await (this.prisma as any)[model].findFirst({
      where: whereClause,
    });

    if (record)
      throw new BadRequestException(
        `${field} ${record[field]} has already been taken.`,
      );

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const [, field] = args.constraints;
    return `${field} must be unique.`;
  }
}

export function IsUnique(
  model: string,
  field: string,
  ignoreIdField: string | null = null,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      propertyName,
      name: 'isUnique',
      target: object.constructor,
      constraints: [model, field, ignoreIdField],
      options: {
        message: `${field} must be unique.`,
        ...validationOptions,
      },
      validator: IsUniqueConstraint,
    });
  };
}
