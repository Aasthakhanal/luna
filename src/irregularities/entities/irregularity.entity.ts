import { IrregularityType } from "@prisma/client";

export class Irregularity {
    id: number;
    user_id: number;
    cycle_id: number;
    irregularity_type: IrregularityType;
    created_at: Date;
    updated_at: Date;
}
