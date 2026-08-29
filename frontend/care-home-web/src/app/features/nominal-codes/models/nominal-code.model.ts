export interface NominalCode {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateNominalCodeRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateNominalCodeRequest extends CreateNominalCodeRequest {
  isActive: boolean;
}
