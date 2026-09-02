export interface InvoiceCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateInvoiceCategoryRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateInvoiceCategoryRequest extends CreateInvoiceCategoryRequest {
  isActive: boolean;
}
