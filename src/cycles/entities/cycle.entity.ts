import { PhaseType } from "@prisma/client";

export class Cycle {
    id: number;
    user_id: number;
    start_date: Date;
    predicted_start_date: Date;
    end_date: Date | null;
    predicted_end_date: Date;
    type: PhaseType;
    description?: string | null;
    created_at: Date;
    updated_at: Date;
}
