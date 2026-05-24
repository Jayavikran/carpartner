import React from "react";
import { motion } from "motion/react";
import { Car, CarStatus, formatDate } from "../types";
import { Calendar, Tag, HardDriveDownload, Sparkles, TrendingUp, UserCheck, Trash2, ArrowRight, Printer, ChevronDown, CheckSquare, Plus, DollarSign, FilePlus } from "lucide-react";

interface CarCardProps {
  car: Car;
  onViewDetails: (carId: string) => void;
  onDeleteCar: (carId: string) => void;
  onOpenAdvisor: (car: Car) => void;
  onTriggerPrint: (car: Car) => void;
  onUpdateCar?: (carId: string, updatedFields: Partial<Car>) => Promise<void>;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function CarCard({ 
  car, 
  onViewDetails, 
  onDeleteCar, 
  onOpenAdvisor, 
  onTriggerPrint, 
  onUpdateCar,
  isSelected,
  onToggleSelect
}: CarCardProps) {
  // Calculations
  const totalExpenses = car.expenses.reduce((sum, e) => sum + e.amount, 0);
  const costBasis = car.purchaseAmount + totalExpenses;
  const isSold = car.status === "Sold";
  const revenue = isSold ? (car.saleAmount || 0) : 0;
  const netProfit = isSold ? (revenue - costBasis) : 0;
  const roi = isSold && costBasis > 0 ? ((netProfit / costBasis) * 100).toFixed(1) : "0";
  const roiNum = isSold && costBasis > 0 ? (netProfit / costBasis) * 100 : 0;
  const isHighProfit = isSold && roiNum > 10;

  // Compute total partner payout value (overdue if sold but payoutsProcessed is falsy)
  const totalPartnerPayout = React.useMemo(() => {
    if (!isSold) return 0;
    return car.investments.reduce((sum, inv) => {
      const shareOfProfit = (netProfit * inv.profitSharePercent) / 100;
      return sum + inv.investedAmount + shareOfProfit;
    }, 0);
  }, [isSold, car.investments, netProfit]);

  const hasUnprocessedPayouts = isSold && car.investments.length > 0 && !car.payoutsProcessed;

  // Local statuses & controllers for inline exit (Mark as Sold)
  const [isEnteringSale, setIsEnteringSale] = React.useState(false);
  const [localSaleAmount, setLocalSaleAmount] = React.useState(costBasis.toString());
  const [localSaleDate, setLocalSaleDate] = React.useState(new Date().toISOString().substring(0, 10));
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // States for Quick Actions overlays
  const [isAddingExpense, setIsAddingExpense] = React.useState(false);
  const [expenseAmount, setExpenseAmount] = React.useState("");
  const [expenseType, setExpenseType] = React.useState<string>("Other");
  const [expenseDesc, setExpenseDesc] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().substring(0, 10));

  const [isAddingDoc, setIsAddingDoc] = React.useState(false);
  const [docName, setDocName] = React.useState("");
  const [docFile, setDocFile] = React.useState<File | null>(null);

  const [showQuickMenu, setShowQuickMenu] = React.useState(false);
  const [isSettlingConfirm, setIsSettlingConfirm] = React.useState(false);

  // Status transition state to provide premium visual feedback
  const prevStatusRef = React.useRef(car.status);
  const [justUpdated, setJustUpdated] = React.useState(false);

  React.useEffect(() => {
    if (prevStatusRef.current !== car.status) {
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 1500);
      prevStatusRef.current = car.status;
      return () => clearTimeout(timer);
    }
  }, [car.status]);

  // Status-based formatting
  const statusStyles = {
    Purchased: { bg: "bg-slate-100 text-slate-700 border-slate-200/60", label: "Sourced" },
    "In Service": { bg: "bg-amber-50 text-amber-650 border-amber-100", label: "In Workshop" },
    "Showroom Ready": { bg: "bg-blue-50 text-accent border-blue-100/60", label: "Showroom" },
    Sold: { bg: "bg-emerald-50 text-emerald-600 border-emerald-150", label: "Sold" }
  };

  // Check if a car image was uploaded
  const carImageDoc = car.documents.find(d => d.name.startsWith("[Car_Image]_"));

  const handleStatusSelect = async (newStatus: CarStatus) => {
    if (newStatus === "Sold") {
      setLocalSaleAmount(costBasis.toString());
      setIsEnteringSale(true);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      if (onUpdateCar) {
        await onUpdateCar(car.id, { 
          status: newStatus,
          saleAmount: undefined,
          saleDate: undefined,
          buyerDetails: undefined,
          deliveryInfo: undefined 
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(localSaleAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid positive sale amount.");
      return;
    }

    try {
      setIsUpdatingStatus(true);
      if (onUpdateCar) {
        await onUpdateCar(car.id, {
          status: "Sold",
          saleAmount: amountVal,
          saleDate: localSaleDate || new Date().toISOString().substring(0, 10),
          buyerDetails: car.buyerDetails || "",
          deliveryInfo: car.deliveryInfo || ""
        });
      }
      setIsEnteringSale(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <motion.div 
      whileHover={{ 
        y: -5,
        scale: 1.02,
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)"
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={`bg-white border rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between group relative transition-all duration-500 ${
        justUpdated 
          ? "ring-4 ring-indigo-500/35 border-indigo-500 scale-[1.01] shadow-lg bg-indigo-50/5" 
          : "border-custom-border hover:border-indigo-200"
      }`}
    >
      
      {/* Absolute Exit Form overlay covers the card when triggering Sell state inline */}
      {isEnteringSale && (
        <div className="absolute inset-0 bg-white/98 backdrop-blur-xs flex flex-col justify-between p-6 z-20 animate-fade-in">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Record Deal Exit (Mark Sold)
              </h4>
              <p className="text-[11px] text-muted leading-tight mt-1">
                Enter exit transaction particulars for <b className="text-ink">{car.makeModel}</b>. Cost basis is ₹{costBasis.toLocaleString("en-IN")}.
              </p>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Sale Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={localSaleAmount}
                  onChange={(e) => setLocalSaleAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-custom-border rounded-lg text-xs font-mono font-semibold text-ink focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. 550000"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Sale Date
                </label>
                <input
                  type="date"
                  required
                  value={localSaleDate}
                  onChange={(e) => setLocalSaleDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-custom-border rounded-lg text-xs font-sans text-ink focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer select-none active:scale-95 transition-all disabled:opacity-50 font-sans"
                >
                  {isUpdatingStatus ? "Updating..." : "Mark Sold"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEnteringSale(false)}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer select-none active:scale-95 transition-all font-sans"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Form overlay */}
      {isAddingExpense && (
        <div className="absolute inset-0 bg-white/98 backdrop-blur-xs flex flex-col justify-between p-6 z-20 animate-fade-in font-sans">
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Add Refurbishment Expense
              </h4>
              <p className="text-[11px] text-muted leading-tight mt-1">
                Log a new workshop expense for <b className="text-ink">{car.makeModel}</b>.
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                  Category
                </label>
                <select
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-custom-border rounded-lg text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Maintenance Charges">Maintenance Charges</option>
                  <option value="Broker Commission">Broker Commission</option>
                  <option value="Service Expenses">Service Expenses</option>
                  <option value="Legal & Documentation">Legal & Documentation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-custom-border rounded-lg text-xs font-mono font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 1500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-50 border border-custom-border rounded-lg text-xs text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                  Description
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-custom-border rounded-lg text-xs text-ink focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Oil change"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const amt = parseFloat(expenseAmount);
                  if (isNaN(amt) || amt <= 0) {
                    alert("Please enter a valid amount.");
                    return;
                  }
                  if (!expenseDesc.trim()) {
                    alert("Please enter a description.");
                    return;
                  }
                  const newExpense = {
                    id: Date.now().toString(),
                    type: expenseType as any,
                    amount: amt,
                    date: expenseDate,
                    description: expenseDesc.trim()
                  };
                  try {
                    setIsUpdatingStatus(true);
                    if (onUpdateCar) {
                      await onUpdateCar(car.id, {
                        expenses: [...car.expenses, newExpense]
                      });
                    }
                    setIsAddingExpense(false);
                    setExpenseAmount("");
                    setExpenseDesc("");
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }}
                disabled={isUpdatingStatus}
                className="flex-1 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
              >
                Log Expense
              </button>
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Form overlay */}
      {isAddingDoc && (
        <div className="absolute inset-0 bg-white/98 backdrop-blur-xs flex flex-col justify-between p-6 z-20 animate-fade-in font-sans">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <FilePlus className="h-4 w-4 text-indigo-500" />
                Upload Legal Document
              </h4>
              <p className="text-[11px] text-muted leading-tight mt-1">
                Upload safety, insurance, RC or other papers for <b className="text-ink">{car.makeModel}</b>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Document Alias Name
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-custom-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. RC Transfer Letter"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files) {
                      setDocFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!docFile) {
                    alert("Please select a file to upload.");
                    return;
                  }
                  const nameToUse = docName.trim() || docFile.name;
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    const base64 = e.target?.result as string;
                    const newDoc = {
                      id: Date.now().toString(),
                      name: nameToUse,
                      type: docFile.type,
                      uploadedAt: new Date().toISOString().substring(0, 10),
                      base64Data: base64
                    };
                    try {
                      setIsUpdatingStatus(true);
                      if (onUpdateCar) {
                        await onUpdateCar(car.id, {
                          documents: [...car.documents, newDoc]
                        });
                      }
                      setIsAddingDoc(false);
                      setDocName("");
                      setDocFile(null);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsUpdatingStatus(false);
                    }
                  };
                  reader.readAsDataURL(docFile);
                }}
                disabled={isUpdatingStatus}
                className="flex-1 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingDoc(false);
                  setDocName("");
                  setDocFile(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optional Car Card Image header display */}
      {carImageDoc && (
        <div className="w-full h-36 bg-slate-100 border-b border-custom-border overflow-hidden relative">
          <img 
            src={carImageDoc.base64Data} 
            alt={car.makeModel} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-6 pb-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          {/* License Plate Style & Health indicator icon */}
          <div className="flex items-center gap-1.5">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected || false}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mr-0.5"
              />
            )}
            <span 
              className={`p-1 rounded-full transition-all flex items-center justify-center ${
                isHighProfit 
                  ? "bg-emerald-100 text-emerald-650 animate-pulse border border-emerald-200" 
                  : "bg-slate-50 border border-slate-100 text-slate-300"
              }`}
              title={isHighProfit ? `Excellent Deal Health! Realized a profitable ${roi}% ROI (>10%)` : `Deal status active. ROI: ${roi}%`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <div className="inline-block px-2.5 py-0.5 bg-slate-100 border border-custom-border rounded font-mono text-xs font-bold text-ink tracking-wider uppercase">
              {car.vehicleNumber}
            </div>
          </div>

          {/* Interactive Status Dropdown directly in CarCard with Clickable Printer Icon */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTriggerPrint(car)}
              title="Print Vehicle Statement"
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-650 rounded-lg border border-custom-border focus:outline-none cursor-pointer transition active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
            <div className={`relative transition-all duration-500 ${justUpdated ? "scale-105" : ""}`}>
              <select
                value={car.status}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusSelect(e.target.value as CarStatus)}
                className={`px-2 py-0.5 pr-5 rounded text-[11px] font-semibold border bg-transparent cursor-pointer outline-none transition-all duration-300 appearance-none ${
                  justUpdated ? "ring-2 ring-indigo-500/50 border-indigo-500 shadow-sm" : ""
                } ${
                  statusStyles[car.status]?.bg || "bg-slate-50 text-slate-700 border-slate-200"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                style={{ 
                  backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", 
                  backgroundPosition: "right 0.25rem center", 
                  backgroundSize: "0.6rem", 
                  backgroundRepeat: "no-repeat" 
                }}
              >
                <option value="Purchased">Sourced</option>
                <option value="In Service">In Workshop</option>
                <option value="Showroom Ready">Showroom</option>
                <option value="Sold">Sold</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-ink group-hover:text-accent transition-colors uppercase leading-snug">
            {car.makeModel}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] text-muted">
            <Calendar className="h-3.5 w-3.5 text-muted/60" />
            <span>Bought: <b className="font-medium text-ink">{formatDate(car.purchaseDate)}</b></span>
            <span className="text-custom-border">•</span>
            <span>Source: <b className="font-medium text-ink truncate max-w-[100px] inline-block align-bottom">{car.sellerDetails || "Dealer"}</b></span>
          </div>
        </div>

        {/* Dynamic Refurbishment Progress Lifecycle Steps */}
        <div className="pt-2 border-t border-dashed border-slate-100 animate-fade-in">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2.5">
            <span>Refurbishment Process</span>
            <span className={`px-1.5 py-0.25 rounded text-[9px] font-bold ${
              car.status === "Purchased" ? "bg-slate-100 text-slate-600" :
              car.status === "In Service" ? "bg-amber-100 text-amber-700" :
              car.status === "Showroom Ready" ? "bg-blue-100 text-blue-700" :
              "bg-emerald-100 text-emerald-700"
            }`}>
              {car.status === "Purchased" ? "Sourced" :
               car.status === "In Service" ? "Workshop" :
               car.status === "Showroom Ready" ? "Marketing" : "Closed"}
            </span>
          </div>
          <div className="relative flex items-center justify-between px-1.5">
            {/* Background Line */}
            <div className="absolute left-3 right-3 top-2.5 h-[3px] bg-slate-100 rounded-full -z-0" />
            
            {/* Active Colored Line */}
            <div 
              className="absolute left-3 top-2.5 h-[3px] bg-indigo-500 rounded-full transition-all duration-500 -z-0" 
              style={{ 
                width: car.status === "Purchased" ? "0%" : 
                       car.status === "In Service" ? "33%" : 
                       car.status === "Showroom Ready" ? "66%" : "100%" 
              }} 
            />

            {[
              { status: "Purchased", label: "Sourced" },
              { status: "In Service", label: "Workshop" },
              { status: "Showroom Ready", label: "Showroom" },
              { status: "Sold", label: "Sold" }
            ].map((step, idx) => {
              const stages = ["Purchased", "In Service", "Showroom Ready", "Sold"];
              const currentIdx = stages.indexOf(car.status);
              const stepIdx = stages.indexOf(step.status);
              const isCompleted = currentIdx >= stepIdx;
              const isActive = car.status === step.status;

              return (
                <div key={idx} className="flex flex-col items-center relative z-10 shrink-0">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusSelect(step.status as CarStatus);
                    }}
                    className={`h-[22px] w-[22px] rounded-full flex items-center justify-center border transition-all duration-300 active:scale-90 cursor-pointer ${
                      isActive 
                        ? "bg-indigo-650 border-indigo-650 text-white shadow-md scale-110" 
                        : isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600"
                    }`}
                    title={`Update status to ${step.label}`}
                  >
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  </button>
                  <span className={`text-[9px] font-bold mt-1 shadow-3xs tracking-wide ${
                    isActive ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Core Financial Block */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-custom-border">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Total Amount (Base)</span>
            <div className="text-[13px] font-bold text-ink font-mono mt-0.5">
              ₹{costBasis.toLocaleString("en-IN")}
            </div>
            <span className="text-[9px] text-muted font-sans block mt-0.5">
              Outlay: ₹{car.purchaseAmount.toLocaleString("en-IN")}
            </span>
          </div>

          <div>
            {isSold ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-650 flex items-center gap-1">
                    Net Profit <TrendingUp className="h-3 w-3" />
                  </span>
                  <div className="text-[13px] font-bold font-mono text-emerald-600 mt-0.5 animate-fade-in">
                    ₹{netProfit.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[9px] font-medium text-emerald-600 font-sans block mt-0.5">
                    Yield: {roi}% ROI
                  </span>
                </div>
                {/* Visual Radial ROI Gauge */}
                <div 
                  className={`relative flex items-center justify-center h-10 w-10 shrink-0 select-none rounded-full border-2 ${
                    roiNum >= 15 
                      ? "border-emerald-500 bg-emerald-50/15" 
                      : roiNum >= 5 
                        ? "border-amber-500 bg-amber-50/15" 
                        : "border-rose-500 bg-rose-50/15"
                  }`} 
                  title={`ROI: ${roi}%`}
                >
                  <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      className="stroke-slate-100"
                      strokeWidth="3.5"
                      fill="transparent"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      className="transition-all duration-500"
                      strokeWidth="3.5"
                      style={{
                        stroke: roiNum >= 15 ? "#10b981" : roiNum >= 5 ? "#f59e0b" : "#ef4444",
                        strokeDasharray: `${2 * Math.PI * 14}`,
                        strokeDashoffset: `${(2 * Math.PI * 14) * (1 - Math.min(Math.max(roiNum, 0), 100) / 100)}`
                      }}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[8.5px] font-mono font-bold text-slate-700">
                    {Math.round(roiNum)}%
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted">Current Status</span>
                <div className="text-[13px] font-bold text-muted font-sans mt-0.5">
                  Inventory active
                </div>
                <span className="text-[9px] text-muted block mt-0.5">
                  Pending client closure
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Partners Connected */}
        <div className="pt-3 border-t border-custom-border space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">Dealership Partners Amount</span>
          {car.investments.length === 0 ? (
            <span className="text-xs text-muted italic font-sans">No partner amounts linked yet</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {car.investments.map((inv, idx) => (
                <div key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-custom-border rounded text-[10px] text-slate-600 font-sans">
                  <UserCheck className="h-2.5 w-2.5 text-muted" />
                  <span className="font-medium truncate max-w-[80px]">{inv.partnerName}</span>
                  <span className="font-bold text-accent">₹{inv.investedAmount.toLocaleString("en-IN")} ({inv.profitSharePercent}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settlement Due Banner Notifications */}
        {hasUnprocessedPayouts && (
          <div className="pt-3 border-t border-custom-border font-sans">
            <div className="px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg flex items-center justify-between gap-1.5 min-h-[52px]">
              <div className="min-w-0">
                <span className="text-[9px] font-black text-rose-750 uppercase tracking-widest block leading-none">Settlement Due</span>
                <span className="text-xs font-black font-mono text-rose-600 block mt-1 whitespace-nowrap">
                  ₹{totalPartnerPayout.toLocaleString("en-IN")}
                </span>
              </div>
              {onUpdateCar && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSettlingConfirm ? (
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-rose-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await onUpdateCar(car.id, { payoutsProcessed: true });
                            setIsSettlingConfirm(false);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-extrabold transition cursor-pointer active:scale-95"
                      >
                        Settle
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSettlingConfirm(false);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold transition cursor-pointer active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSettlingConfirm(true);
                      }}
                      className="px-2.5 py-1 bg-rose-650 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-sm active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0 animate-pulse"
                    >
                      Settle payouts
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-bg px-6 py-3 border-t border-custom-border flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(car.id)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            Manage Deal Folder
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          {/* Quick Actions Dropdown Menu */}
          <div className="relative inline-block text-left">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickMenu(!showQuickMenu);
              }}
              type="button"
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-custom-border rounded text-[11px] font-bold text-slate-600 hover:text-ink cursor-pointer flex items-center gap-0.5 transition active:scale-95"
            >
              <span>Quick Actions</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showQuickMenu && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQuickMenu(false);
                  }}
                />
                <div className="absolute left-0 bottom-full mb-1.5 w-36 bg-white border border-custom-border rounded-lg shadow-lg py-1 z-30 animate-fade-in text-[11px] font-sans">
                  {!isSold && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        setIsEnteringSale(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <CheckSquare className="h-3 w-3 text-emerald-650" />
                      <span>Mark Sold</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickMenu(false);
                      setIsAddingExpense(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <DollarSign className="h-3 w-3 text-amber-500" />
                    <span>Add Expense</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickMenu(false);
                      setIsAddingDoc(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <FilePlus className="h-3 w-3 text-indigo-500" />
                    <span>Add Document</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Print Quick Button specifically to trigger the browser print view for this car's individual detail report */}
          <button
            onClick={() => onTriggerPrint(car)}
            title="Print Vehicle Statement"
            className="p-1.5 bg-bg border border-custom-border text-muted rounded-lg hover:bg-slate-100 hover:text-indigo-600 active:scale-95 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          {/* AI Advisor Quick Button */}
          <button
            onClick={() => onOpenAdvisor(car)}
            title="Evaluate with AI Dealer Intelligence"
            className="p-1.5 bg-bg border border-custom-border text-muted rounded-lg hover:bg-slate-100 hover:text-ink active:scale-95 transition cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 fill-current" />
          </button>

          {/* Delete Guard */}
          <button
            onClick={() => {
              if (window.confirm(`Are you absolutely sure you want to delete car deal ${car.vehicleNumber}? All associated investments, expense logs, and legal paper uploads will be removed from system server archives.`)) {
                onDeleteCar(car.id);
              }
            }}
            title="Wipe record"
            className="p-1.5 bg-bg border border-rose-100 text-rose-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

    </motion.div>
  );
}
