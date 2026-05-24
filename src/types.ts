export interface PartnerInvestment {
  partnerName: string;
  investedAmount: number;
  profitSharePercent: number;
}

export interface Partner {
  id: string;
  name: string;
  walletBalance: number;
}

export type ExpenseType = "Petrol" | "Maintenance Charges" | "Broker Commission" | "Service Expenses" | "Legal & Documentation" | "Other";

export interface Expense {
  id: string;
  type: ExpenseType;
  amount: number;
  date: string;
  description: string;
}

export interface CarDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  base64Data: string;
}

export type CarStatus = "Purchased" | "In Service" | "Showroom Ready" | "Sold";

export interface Car {
  id: string;
  vehicleNumber: string;
  makeModel: string;
  purchaseDate: string;
  purchaseAmount: number;
  sellerDetails: string;
  status: CarStatus;
  saleDate?: string;
  saleAmount?: number;
  buyerDetails?: string;
  deliveryInfo?: string;
  investments: PartnerInvestment[];
  expenses: Expense[];
  documents: CarDocument[];
  payoutsProcessed?: boolean;
  notes?: string;
}

export interface AIAdvisorResponse {
  report?: string;
  error?: string;
  isConfigError?: boolean;
  fallbackContent?: string;
}

/**
 * Formats a date string consistently into DD-MM-YYYY format
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "---";
  
  const cleanStr = dateString.trim();
  
  // If already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleanStr)) {
    return cleanStr;
  }
  
  // If in YYYY-MM-DD format
  const ymdMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}-${m}-${y}`;
  }

  // Fallback to standard JS Date parsing
  try {
    const dObj = new Date(cleanStr);
    if (!isNaN(dObj.getTime())) {
      const day = String(dObj.getDate()).padStart(2, '0');
      const month = String(dObj.getMonth() + 1).padStart(2, '0');
      const year = dObj.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {
    // Ignore and fallback to raw string
  }
  
  return cleanStr;
}

