export interface CareHomeLocation {
    id: number;
    companyId: number;
    companyName: string;

    code: string;
    name: string;

    bedCapacity: number;

    address: string | null;
    phone: string | null;
    email: string | null;

    managerName: string | null;
    managerPhone: string | null;
    managerEmail: string | null;

    isActive: boolean;
}

export interface CreateCareHomeRequest {
    companyId: number;

    code: string;
    name: string;

    bedCapacity: number;

    address?: string;
    phone?: string;
    email?: string;

    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
}

export interface UpdateCareHomeRequest
    extends CreateCareHomeRequest {

    isActive: boolean;
}