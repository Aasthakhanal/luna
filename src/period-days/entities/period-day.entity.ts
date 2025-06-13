import { FlowLevel } from "@prisma/client";

export class PeriodDay {
  cycle_id: number;
  flow_level: FlowLevel;
  date: Date;
  description?: string;
  created_at: Date;
  updated_at: Date;
}
