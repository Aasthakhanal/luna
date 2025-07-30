export class Gynecologist {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  specialty: string;
  latitude: number;
  longitude: number;
  distance_km?: number | null;
  createdAt: Date;
  updatedAt: Date;
}
