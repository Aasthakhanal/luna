import { Role } from "@prisma/client";

export class User {
    id: number;
    name: string;
    email: string;
    password: string;
    phone_number: string;
    role: Role;
    fcm_token: string | null;
    created_at: Date;
    updated_at: Date;
}
