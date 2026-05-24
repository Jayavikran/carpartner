import React, { useState } from "react";
import { Car, PartnerInvestment, Expense, ExpenseType, CarStatus, CarDocument, formatDate, Partner } from "../types";
import { X, Calendar, UserPlus, Trash, Plus, FileText, Download, Sparkles, TrendingUp, HandCoins, AlertCircle, Eye, Printer, Layers, Edit, Check, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface CarDetailModalProps {
  car: Car;
  partners?: Partner[];
  onRefreshPartners?: () => void;
  onClose: () => void;
  onUpdateCar: (carId: string, updatedFields: Partial<Car>) => Promise<void>;
  onTriggerPrint: (car: Car) => void;
}

export default function CarDetailModal({ car, partners = [], onRefreshPartners, onClose, onUpdateCar, onTriggerPrint }: CarDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "documents" | "ai-advisor">("overview");

  // Central Staged State - holds all metadata, partner investment array, and expense array locally
  const [stagedCar, setStagedCar] = useState<Car>({ ...car });
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Sync staged car when prop updates from external or post-save response
  React.useEffect(() => {
    setStagedCar(prev => {
      if (prev.id !== car.id) {
        return { ...car };
      }
      return {
        ...prev,
        documents: car.documents,
        expenses: car.expenses,
        investments: car.investments
      };
    });
  }, [car]);

  // Mark as Sold Forms Buffers
  const [saleDate, setSaleDate] = useState(car.saleDate || new Date().toISOString().split("T")[0]);
  const [saleAmount, setSaleAmount] = useState<number>(car.saleAmount || car.purchaseAmount * 1.25);
  const [buyerDetails, setBuyerDetails] = useState(car.buyerDetails || "");
  const [deliveryInfo, setDeliveryInfo] = useState(car.deliveryInfo || "");

  // Inline editable buyer info
  const [isEditingBuyer, setIsEditingBuyer] = useState(false);
  const [buyerDetailsInput, setBuyerDetailsInput] = useState(car.buyerDetails || "");
  const [deliveryInfoInput, setDeliveryInfoInput] = useState(car.deliveryInfo || "");

  // Add Expense form state
  const [expType, setExpType] = useState<ExpenseType>("Maintenance Charges");
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expDesc, setExpDesc] = useState("");
  const [expError, setExpError] = useState("");

  // Add investment row state (for live adding partners)
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerAmount, setNewPartnerAmount] = useState<number>(0);
  const [newPartnerShare, setNewPartnerShare] = useState<number>(50); // defaults to 50% automatically!
  const [useCustomNameDetail, setUseCustomNameDetail] = useState(false);
  const [investError, setInvestError] = useState("");

  // AI Advisor state
  const [aiReport, setAiReport] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [showModalSettleConfirm, setShowModalSettleConfirm] = useState(false);

  // Document management upload states
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState("");
  const [previewDoc, setPreviewDoc] = useState<CarDocument | null>(null);

  // Quick Notes State
  const [notesInput, setNotesInput] = useState(car.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesFeedback, setNotesFeedback] = useState("");

  React.useEffect(() => {
    setNotesInput(car.notes || "");
  }, [car.notes]);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setNotesFeedback("");
    try {
      setStagedCar(prev => ({ ...prev, notes: notesInput }));
      await onUpdateCar(stagedCar.id, { notes: notesInput });
      setNotesFeedback("Notes saved successfully!");
      setTimeout(() => setNotesFeedback(""), 3000);
    } catch (err) {
      console.error(err);
      setNotesFeedback("Failed to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Edit partner investment state
  const [editingInvestIdx, setEditingInvestIdx] = useState<number | null>(null);
  const [editPartnerName, setEditPartnerName] = useState("");
  const [editPartnerAmount, setEditPartnerAmount] = useState<number>(0);
  const [editPartnerShare, setEditPartnerShare] = useState<number>(0);

  // General Vehicle Metadata edit state
  const [isEditingCarMeta, setIsEditingCarMeta] = useState(false);
  const [metaVehicleNumber, setMetaVehicleNumber] = useState(car.vehicleNumber);
  const [metaMakeModel, setMetaMakeModel] = useState(car.makeModel);
  const [metaPurchaseDate, setMetaPurchaseDate] = useState(car.purchaseDate);
  const [metaPurchaseAmount, setMetaPurchaseAmount] = useState<number>(car.purchaseAmount);
  const [metaSellerDetails, setMetaSellerDetails] = useState(car.sellerDetails || "");

  // Summary Metrics calculated live from central staged state
  const totalExpenses = stagedCar.expenses.reduce((sum, e) => sum + e.amount, 0);
  const costBasis = stagedCar.purchaseAmount + totalExpenses;
  const isSold = stagedCar.status === "Sold";
  const revenue = isSold ? (stagedCar.saleAmount || 0) : 0;
  const netProfit = isSold ? (revenue - costBasis) : 0;
  const roi = isSold && costBasis > 0 ? ((netProfit / costBasis) * 100).toFixed(1) : "0";

  // Cumulative Partner investments from central staged state
  const totalPartnerAmount = stagedCar.investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalPartnerSharePercent = stagedCar.investments.reduce((sum, inv) => sum + inv.profitSharePercent, 0);

  // Partner equity pool validations
  const hasPartners = stagedCar.investments.length > 0;
  const isProfitShareValid = !hasPartners || Math.abs(totalPartnerSharePercent - 100) < 0.01;

  // Track if there are unsaved drafts in the local session
  const hasChanges = React.useMemo(() => {
    return (
      stagedCar.makeModel !== car.makeModel ||
      stagedCar.vehicleNumber !== car.vehicleNumber ||
      stagedCar.purchaseDate !== car.purchaseDate ||
      stagedCar.purchaseAmount !== car.purchaseAmount ||
      (stagedCar.sellerDetails || "") !== (car.sellerDetails || "") ||
      stagedCar.status !== car.status ||
      (stagedCar.notes || "") !== (car.notes || "") ||
      (stagedCar.status === "Sold" && (
        stagedCar.saleDate !== car.saleDate ||
        stagedCar.saleAmount !== car.saleAmount ||
        (stagedCar.buyerDetails || "") !== (car.buyerDetails || "") ||
        (stagedCar.deliveryInfo || "") !== (car.deliveryInfo || "")
      )) ||
      JSON.stringify(stagedCar.expenses) !== JSON.stringify(car.expenses) ||
      JSON.stringify(stagedCar.investments) !== JSON.stringify(car.investments)
    );
  }, [stagedCar, car]);

  // Bulk Master Save function to put the entire staged model to database
  const handleBulkSaveDossier = async () => {
    if (hasPartners && !isProfitShareValid) {
      alert(`Equity Balance Required: Click on edit to tune partner profit shares to total exactly 100% (currently ${totalPartnerSharePercent}%).`);
      return;
    }

    if (hasPartners && Math.abs(totalPartnerAmount - stagedCar.purchaseAmount) > 1.0) {
      alert(`Investment Discrepancy: The total of all partner contributions is ₹${totalPartnerAmount.toLocaleString("en-IN")}, but the car purchase price is ₹${stagedCar.purchaseAmount.toLocaleString("en-IN")}. Please adjust the manual contributions to match the purchase price.`);
      return;
    }

    try {
      setIsSavingBulk(true);
      await onUpdateCar(car.id, {
        makeModel: stagedCar.makeModel,
        vehicleNumber: stagedCar.vehicleNumber,
        purchaseDate: stagedCar.purchaseDate,
        purchaseAmount: stagedCar.purchaseAmount,
        sellerDetails: stagedCar.sellerDetails || "",
        status: stagedCar.status,
        saleDate: stagedCar.saleDate,
        saleAmount: stagedCar.saleAmount,
        buyerDetails: stagedCar.buyerDetails || "",
        deliveryInfo: stagedCar.deliveryInfo || "",
        expenses: stagedCar.expenses,
        investments: stagedCar.investments,
        notes: notesInput
      });
    } catch (err: any) {
      alert(err.message || "Failed to commit unified dossier to the server.");
    } finally {
      setIsSavingBulk(false);
    }
  };

  // Status handler - modifies local staged state
  const handleStatusChange = (newStatus: CarStatus) => {
    if (newStatus === "Sold") {
      setStagedCar(prev => ({ ...prev, status: "Sold" }));
      return;
    }
    setStagedCar(prev => ({ ...prev, status: newStatus }));
  };

  // Submit Sale Details - modifies local staged state
  const handleMarkAsSoldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saleAmount <= 0) {
      alert("Sold amount must be greater than zero.");
      return;
    }
    setStagedCar(prev => ({
      ...prev,
      status: "Sold",
      saleDate,
      saleAmount,
      buyerDetails: buyerDetails.trim(),
      deliveryInfo: deliveryInfo.trim()
    }));
  };

  // Turn back from Sold status - modifies local staged state
  const handleRollbackStatus = () => {
    setStagedCar(prev => ({
      ...prev,
      status: "Purchased",
      saleDate: undefined,
      saleAmount: undefined,
      buyerDetails: undefined,
      deliveryInfo: undefined
    }));
  };

  // Add Expense Handler - appends to local staged array
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpError("");

    if (expAmount <= 0) {
      setExpError("Expense figure must be greater than zero.");
      return;
    }
    if (!expDesc.trim()) {
      setExpError("Please describe the expense item.");
      return;
    }

    const newExpense: Expense = {
      id: `e-${Date.now()}`,
      type: expType,
      amount: expAmount,
      date: expDate,
      description: expDesc.trim()
    };

    setStagedCar(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
    }));

    // Reset expense form fields
    setExpAmount(0);
    setExpDesc("");
  };

  // Remove Expense Handler - removes from local staged array
  const handleRemoveExpense = (expenseId: string) => {
    setStagedCar(prev => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== expenseId)
    }));
  };

  // Add Partner Investment Row - appends to local staged array
  const handleAddLiveInvest = (e: React.FormEvent) => {
    e.preventDefault();
    setInvestError("");

    if (!newPartnerName.trim()) {
      setInvestError("Please specify a partner name.");
      return;
    }
    if (newPartnerAmount <= 0) {
      setInvestError("Investment amount must be positive.");
      return;
    }
    if (newPartnerShare <= 0 || newPartnerShare > 100) {
      setInvestError("Share percent must be a value between 1 and 100.");
      return;
    }

    const newInv: PartnerInvestment = {
      partnerName: newPartnerName.trim(),
      investedAmount: newPartnerAmount,
      profitSharePercent: newPartnerShare
    };

    setStagedCar(prev => ({
      ...prev,
      investments: [...prev.investments, newInv]
    }));

    // Reset form
    setNewPartnerName("");
    setNewPartnerAmount(0);
    setNewPartnerShare(50);
    setUseCustomNameDetail(false);
  };

  // Delete live partner investment row
  const handleDeleteLiveInvest = (idx: number) => {
    setStagedCar(prev => ({
      ...prev,
      investments: prev.investments.filter((_, i) => i !== idx)
    }));
  };

  const handleStartEditInvest = (idx: number, inv: PartnerInvestment) => {
    setEditingInvestIdx(idx);
    setEditPartnerName(inv.partnerName);
    setEditPartnerAmount(inv.investedAmount);
    setEditPartnerShare(inv.profitSharePercent);
  };

  const handleSaveEditInvest = (idx: number) => {
    if (!editPartnerName.trim()) {
      alert("Partner name is required");
      return;
    }
    if (editPartnerAmount <= 0) {
      alert("Amount must be positive");
      return;
    }
    if (editPartnerShare <= 0 || editPartnerShare > 100) {
      alert("Share percentage must be a value between 1 and 100.");
      return;
    }

    setStagedCar(prev => ({
      ...prev,
      investments: prev.investments.map((inv, i) => {
        if (i === idx) {
          return {
            partnerName: editPartnerName.trim(),
            investedAmount: editPartnerAmount,
            profitSharePercent: editPartnerShare
          };
        }
        return inv;
      })
    }));
    setEditingInvestIdx(null);
  };

  const triggerMatchAmountSplitStaged = () => {
    if (stagedCar.investments.length === 0) return;
    const shareCount = stagedCar.investments.length;
    const splitPrice = Math.round(stagedCar.purchaseAmount / shareCount);
    const splitShare = Number((100 / shareCount).toFixed(1));

    setStagedCar(prev => ({
      ...prev,
      investments: prev.investments.map(p => ({
        ...p,
        investedAmount: splitPrice,
        profitSharePercent: splitShare
      }))
    }));
  };

  // Modify inline buyer details locally
  const handleSaveBuyerDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setStagedCar(prev => ({
      ...prev,
      buyerDetails: buyerDetailsInput.trim(),
      deliveryInfo: deliveryInfoInput.trim()
    }));
    setIsEditingBuyer(false);
  };

  // Specialized upload handler for designated documents - supporting single or multiple files
  const handleSpecialFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, prefix: "[RC_Book]" | "[Agreement]" | "[Car_Image]") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setDocError("");
    setDocLoading(true);

    try {
      if (prefix !== "[Car_Image]") {
        const file = files[0];
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Error reading file."));
          reader.readAsDataURL(file);
        });
        const base64String = await base64Promise;

        const existingDoc = stagedCar.documents.find(d => d.name.startsWith(`${prefix}_`));
        if (existingDoc) {
          await fetch(`/api/cars/${car.id}/documents/${existingDoc.id}`, { method: "DELETE" });
        }

        const response = await fetch(`/api/cars/${car.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${prefix}_${file.name}`,
            type: file.type || "application/octet-stream",
            base64Data: base64String
          })
        });

        if (!response.ok) {
          throw new Error("Server rejected document payload");
        }

        const updatedCar = await response.json();
        await onUpdateCar(car.id, { documents: updatedCar.documents });
        setStagedCar(prev => ({ ...prev, documents: updatedCar.documents }));
      } else {
        // [Car_Image] multiple files upload!
        let latestDocs = [...stagedCar.documents];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Error reading file."));
            reader.readAsDataURL(file);
          });
          
          const base64String = await base64Promise;
          const response = await fetch(`/api/cars/${car.id}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${prefix}_${file.name}`,
              type: file.type || "image/jpeg",
              base64Data: base64String
            })
          });

          if (response.ok) {
            const updatedCar = await response.json();
            latestDocs = updatedCar.documents;
          }
        }
        await onUpdateCar(car.id, { documents: latestDocs });
        setStagedCar(prev => ({ ...prev, documents: latestDocs }));
      }
    } catch (err: any) {
      setDocError(err.message || "File upload failed.");
    } finally {
      setDocLoading(false);
    }
  };

  // File / Document Reader Upload Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocError("");
    setDocLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = reader.result as string;
        // Strip data prefix like `data:application/pdf;base64,` to keep backend clean or keep it as payload
        const response = await fetch(`/api/cars/${car.id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: file.type || "application/octet-stream",
            base64Data: base64String
          })
        });

        if (!response.ok) {
          throw new Error("Server rejected document payload");
        }

        const updatedCar = await response.json();
        // Invoke local state update
        await onUpdateCar(car.id, { documents: updatedCar.documents });
        setStagedCar(prev => ({ ...prev, documents: updatedCar.documents }));
      } catch (err: any) {
        setDocError(err.message || "File upload failed.");
      } finally {
        setDocLoading(false);
      }
    };

    reader.onerror = () => {
      setDocError("Error reading file.");
      setDocLoading(false);
    };

    reader.readAsDataURL(file);
  };

  // Document removal
  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Verify: Clear this legal file folder attachment?")) return;
    try {
      const response = await fetch(`/api/cars/${car.id}/documents/${docId}`, {
         method: "DELETE"
      });
      if (!response.ok) throw new Error("Could not delete file from server archive");
      const updatedCar = await response.json();
      await onUpdateCar(car.id, { documents: updatedCar.documents });
      setStagedCar(prev => ({ ...prev, documents: updatedCar.documents }));
    } catch (err) {
      console.error(err);
    }
  };

  // AI Advisor trigger
  const handleFetchAiAdvisor = async () => {
    setAiLoading(true);
    setAiError("");
    setAiReport("");

    try {
      const res = await fetch("/api/ai/deal-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: car.id })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.isConfigError) {
          // It's a config fallback warning but with useful rule-based data!
          setAiReport(data.fallbackContent);
        } else {
          throw new Error(data.error || "Server could not call Gemini models.");
        }
      } else {
        setAiReport(data.report);
      }
    } catch (error: any) {
      setAiError(error.message || "Error reaching AI proxy.");
    } finally {
      setAiLoading(false);
    }
  };

  // Quick download helper
  const triggerDownloadDocument = (doc: CarDocument) => {
    const link = document.createElement("a");
    link.href = doc.base64Data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-scrollbar">
      <div className="bg-white border border-custom-border rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden my-2 sm:my-6 select-none flex flex-col h-[95vh] sm:h-[90vh]">
        
        {/* Header Block - Optimised for mobile viewports */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-bg border-b border-custom-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 border border-custom-border rounded text-ink uppercase tracking-wider">
                {stagedCar.vehicleNumber}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted tracking-wider">Folder Dossier</span>
            </div>
            <h3 className="font-bold text-ink text-sm sm:text-base uppercase leading-tight tracking-tight">
              {stagedCar.makeModel}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Print Friendly Trigger */}
            <button
              onClick={() => onTriggerPrint(stagedCar)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-ink bg-white border border-custom-border rounded-lg hover:bg-bg transition active:scale-95 cursor-pointer shadow-xs whitespace-nowrap"
              title="Generate printable A4 audit statement sheet"
            >
              <Printer className="h-3 w-3 text-muted" />
              <span>Print A4</span>
            </button>

            {/* Quick Status Control */}
            {stagedCar.status !== "Sold" && (
              <div className="inline-flex rounded-lg border border-custom-border bg-white p-0.5 shadow-xs">
                {(["Purchased", "In Service", "Showroom Ready"] as CarStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition cursor-pointer ${
                      stagedCar.status === st
                        ? "bg-ink text-white font-bold"
                        : "text-muted hover:text-ink hover:bg-bg/50"
                    }`}
                  >
                    {st === "Purchased" ? "Sourced" : st === "In Service" ? "Workshop" : "Showroom"}
                  </button>
                ))}
              </div>
            )}

            {stagedCar.status === "Sold" ? (
              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-150 text-[10px] sm:text-xs font-bold rounded-lg flex items-center gap-1 whitespace-nowrap">
                <TrendingUp className="h-3 w-3" />
                Sold
              </span>
            ) : (
              <button
                onClick={() => handleStatusChange("Sold")}
                className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition text-[11px] font-bold cursor-pointer shadow-xs whitespace-nowrap"
              >
                Mark Sold
              </button>
            )}

            <button
              onClick={() => {
                if (hasChanges && !window.confirm("You have unsaved changes in this vehicle dossier. Close anyway?")) {
                  return;
                }
                onClose();
              }}
              className="p-1.5 text-muted hover:text-ink active:scale-90 transition cursor-pointer md:ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation links */}
        <div className="flex border-b border-custom-border bg-bg/50 px-4 sm:px-6 py-0.5 gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview & Amount splits" },
            { id: "expenses", label: `Expenses Log (₹${totalExpenses.toLocaleString("en-IN")})` },
            { id: "documents", label: `Documents Trail (${stagedCar.documents.length})` },
            { id: "ai-advisor", label: "AI Smart Advisor", icon: Sparkles }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-accent text-accent font-bold"
                  : "border-transparent text-muted hover:text-ink hover:border-slate-200"
              }`}
            >
              {tab.icon && <tab.icon className="h-3 w-3 text-accent animate-pulse" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Dossier Body Portion */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/25">
          
          {/* TAB 1: OVERVIEW & INVESTMENTS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {/* If entering SOLD information */}
              {stagedCar.status === "Sold" && !stagedCar.saleAmount && (
                <form onSubmit={handleMarkAsSoldSubmit} className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-5 w-5 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-800">Finalise Sale Particulars</h4>
                      <p className="text-xs text-emerald-600">Enter the exit details below to close the deal and settle partner earnings.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Exit Sale amount (₹) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        placeholder="e.g. 620000"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-emerald-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sold Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-emerald-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Buyer profile details</label>
                      <input
                        type="text"
                        placeholder="Name, telephone, notes..."
                        value={buyerDetails}
                        onChange={(e) => setBuyerDetails(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Handover notes / RC submission state</label>
                      <input
                        type="text"
                        placeholder="e.g. keys handed over, insurance transferred"
                        value={deliveryInfo}
                        onChange={(e) => setDeliveryInfo(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 bg-white rounded-lg focus:outline-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3.5 pt-2">
                    <button
                      type="button"
                      onClick={handleRollbackStatus}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer bg-white border border-slate-200 rounded-lg"
                    >
                      Hold Sale / Rollback
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                    >
                      Finalise Settlement
                    </button>
                  </div>
                </form>
              )}

              {/* Deal Sheet & Ledger Cards Header with Edit Options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Purchase & Capital Info</h4>
                  <p className="text-[10px] text-slate-500">View and update primary procuration costs, sourcing details, and plate records.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingCarMeta) {
                      setIsEditingCarMeta(false);
                    } else {
                      setMetaVehicleNumber(stagedCar.vehicleNumber);
                      setMetaMakeModel(stagedCar.makeModel);
                      setMetaPurchaseDate(stagedCar.purchaseDate);
                      setMetaPurchaseAmount(stagedCar.purchaseAmount);
                      setMetaSellerDetails(stagedCar.sellerDetails || "");
                      setIsEditingCarMeta(true);
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <Edit className="h-3 w-3" />
                  {isEditingCarMeta ? "Cancel Edit" : "Edit Vehicle Info"}
                </button>
              </div>

              {isEditingCarMeta ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!metaMakeModel.trim()) return alert("Vehicle make/model is required");
                    if (!metaVehicleNumber.trim()) return alert("Vehicle license plate number is required");
                    if (metaPurchaseAmount <= 0) return alert("Purchase cost must be positive");

                    setStagedCar(prev => ({
                      ...prev,
                      makeModel: metaMakeModel.trim(),
                      vehicleNumber: metaVehicleNumber.trim(),
                      purchaseDate: metaPurchaseDate,
                      purchaseAmount: metaPurchaseAmount,
                      sellerDetails: metaSellerDetails.trim()
                    }));
                    setIsEditingCarMeta(false);
                  }}
                  className="bg-indigo-50/50 border border-indigo-150 p-5 rounded-2xl space-y-4 shadow-sm animate-fade-in text-xs text-slate-700"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Make & Model <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={metaMakeModel}
                        onChange={(e) => setMetaMakeModel(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">License Plate No. <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={metaVehicleNumber}
                        onChange={(e) => setMetaVehicleNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg uppercase font-mono focus:outline-indigo-500 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Sourced Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={metaPurchaseDate}
                        onChange={(e) => setMetaPurchaseDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Procurement Outlay (₹) <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        value={metaPurchaseAmount || ""}
                        onChange={(e) => setMetaPurchaseAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono focus:outline-indigo-500 font-bold"
                        min="1"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Seller details / Sourcing broker specs</label>
                      <input
                        type="text"
                        value={metaSellerDetails}
                        onChange={(e) => setMetaSellerDetails(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-indigo-500"
                        placeholder="Bought from name, contacts, deal notes..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingCarMeta(false)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition bg-white border border-slate-200 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <Check className="h-4 w-4" />
                      Save General Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Outlay Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Procurement Outlay</span>
                    <div className="text-lg font-extrabold text-slate-800 font-mono">
                      ₹{stagedCar.purchaseAmount.toLocaleString("en-IN")}
                    </div>
                    <p className="text-xs text-slate-500">Purchase price cost logged on: <b>{formatDate(stagedCar.purchaseDate)}</b></p>
                    {stagedCar.sellerDetails && (
                      <p className="text-[10.5px] mt-1 text-slate-550 border-t border-slate-50 pt-1">
                        <b>Sourced:</b> <span className="text-slate-600 font-medium">{stagedCar.sellerDetails}</span>
                      </p>
                    )}
                  </div>

                  {/* Capital locked */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Total Outlay</span>
                    <div className="text-lg font-extrabold text-slate-800 font-mono">
                      ₹{costBasis.toLocaleString("en-IN")}
                    </div>
                    <p className="text-xs text-slate-500">Purchase price (₹{(stagedCar.purchaseAmount).toLocaleString()}) + expenses (₹{(totalExpenses).toLocaleString()})</p>
                  </div>

                  {/* Return On Outlay */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                    {isSold ? (
                      <>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 flex items-center gap-1">
                          Sale realized <TrendingUp className="h-3 w-3" />
                        </span>
                        <div className="text-lg font-extrabold text-emerald-700 font-mono">
                          ₹{stagedCar.saleAmount?.toLocaleString("en-IN")}
                        </div>
                        <p className="text-xs text-emerald-600 font-semibold">
                          Net Profit: ₹{netProfit.toLocaleString("en-IN")} ({roi}% profit)
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Expected Margin</span>
                        <div className="text-lg font-bold text-slate-500">
                          Deal is Active
                        </div>
                        <p className="text-xs text-slate-400">Settlement will configure once sold</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SOLD meta detail block if exists */}
              {isSold && stagedCar.saleAmount && (
                <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 space-y-3 text-xs animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Buyer & Delivery Specifics</h4>
                    {!isEditingBuyer ? (
                      <button
                        onClick={() => {
                          setBuyerDetailsInput(stagedCar.buyerDetails || "");
                          setDeliveryInfoInput(stagedCar.deliveryInfo || "");
                          setIsEditingBuyer(true);
                        }}
                        className="text-[11px] text-accent font-semibold hover:underline cursor-pointer"
                      >
                        Edit Buyer Details
                      </button>
                    ) : null}
                  </div>

                  {isEditingBuyer ? (
                    <form onSubmit={handleSaveBuyerDetails} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buyer profile details</label>
                          <input
                            type="text"
                            value={buyerDetailsInput}
                            onChange={(e) => setBuyerDetailsInput(e.target.value)}
                            placeholder="Name, Phone, ID Details..."
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-accent text-ink"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Handover notes / state</label>
                          <input
                            type="text"
                            value={deliveryInfoInput}
                            onChange={(e) => setDeliveryInfoInput(e.target.value)}
                            placeholder="keys transered, rc copy provided..."
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-accent text-ink"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setIsEditingBuyer(false)}
                          className="px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-50 rounded font-semibold text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded font-bold cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Sold Date:</span>
                        <b className="text-slate-700 block font-mono">{formatDate(stagedCar.saleDate)}</b>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Buyer details:</span>
                        <b className="text-slate-700 block">{stagedCar.buyerDetails || "N/A"}</b>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Notes:</span>
                        <p className="text-slate-700 block">{stagedCar.deliveryInfo || "N/A"}</p>
                      </div>
                    </div>
                  )}

                  {!isEditingBuyer && (
                    <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                      <button
                        onClick={handleRollbackStatus}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        ⚠️ Reopen Deal Folder (Rollback Sale Status)
                      </button>
                    </div>
                  )}
                </div>
              )}              {/* Linked Partner Investments Table / Section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">Equity Allocation & Shares</h4>
                    <p className="text-[11px] text-slate-500">Allocated partner investments and mathematically calculated settlements.</p>
                  </div>

                  {/* Settlement Status Controller */}
                  {isSold && stagedCar.investments.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs font-sans text-xs">
                      <span className="font-semibold text-slate-500">Payout:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        stagedCar.payoutsProcessed 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-rose-100 text-rose-800 animate-pulse"
                      }`}>
                        {stagedCar.payoutsProcessed ? "Settled ✔" : "Settlement Due ⚠️"}
                      </span>
                      {showModalSettleConfirm ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded border border-slate-200 animate-fade-in">
                          <span className="text-[10px] font-bold text-slate-500 px-1">Confirm?</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const nextVal = !stagedCar.payoutsProcessed;
                              setStagedCar(prev => ({ ...prev, payoutsProcessed: nextVal }));
                              if (onUpdateCar) {
                                await onUpdateCar(stagedCar.id, { payoutsProcessed: nextVal });
                                onRefreshPartners?.();
                              }
                              setShowModalSettleConfirm(false);
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-extrabold transition cursor-pointer active:scale-95"
                          >
                            Yes, {stagedCar.payoutsProcessed ? "Unpay" : "Settle"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowModalSettleConfirm(false)}
                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-750 rounded text-[9px] font-bold transition cursor-pointer active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowModalSettleConfirm(true)}
                          className="p-1 px-2.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded transition cursor-pointer select-none active:scale-95"
                        >
                          {stagedCar.payoutsProcessed ? "Mark Unpaid" : "Process Payouts"}
                        </button>
                      )}
                    </div>
                  )}

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 self-start sm:self-auto py-0.5">
                    Total Partner Amount: ₹{totalPartnerAmount.toLocaleString("en-IN")} / ₹{stagedCar.purchaseAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                {stagedCar.investments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic">
                    No partner investments connected to this dossier yet.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-2.5">Partner Name</th>
                        <th className="px-4 py-2.5 text-right">Amount Invested (₹)</th>
                        <th className="px-4 py-2.5 text-right">Share of Net Deal (%)</th>
                        <th className="px-4 py-2.5 text-right bg-slate-50/80 font-bold text-slate-700">Realized Profit / Loss (₹)</th>
                        <th className="px-4 py-2.5 text-right font-bold text-slate-800">Payout (Invested + Profit)</th>
                        <th className="px-5 py-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stagedCar.investments.map((inv, idx) => {
                        const shareOfProfit = isSold ? (netProfit * inv.profitSharePercent) / 100 : 0;
                        const payoutValue = isSold ? (inv.investedAmount + shareOfProfit) : inv.investedAmount;
                        const isEditing = editingInvestIdx === idx;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            {isEditing ? (
                              <>
                                <td className="px-5 py-2">
                                  <input
                                    type="text"
                                    value={editPartnerName}
                                    onChange={(e) => setEditPartnerName(e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-indigo-505 font-bold text-slate-750"
                                    placeholder="Vikram Shah"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <input
                                    type="number"
                                    value={editPartnerAmount || ""}
                                    onChange={(e) => setEditPartnerAmount(Number(e.target.value))}
                                    className="w-28 px-2 py-1 text-xs bg-white border border-slate-200 rounded text-right font-mono font-bold focus:outline-indigo-550 text-slate-800"
                                    placeholder="Contribution"
                                    min="0"
                                  />
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editPartnerShare || ""}
                                      onChange={(e) => setEditPartnerShare(Number(e.target.value))}
                                      className={`w-16 px-2 py-1 text-xs bg-white border rounded text-right font-mono font-bold transition focus:outline-none focus:ring-1 ${
                                        isProfitShareValid 
                                          ? "border-emerald-350 text-emerald-800 focus:ring-emerald-400 bg-emerald-50/10 focus:border-emerald-400" 
                                          : "border-rose-350 text-rose-700 bg-rose-50/10 focus:ring-rose-400 focus:border-rose-400"
                                      }`}
                                      placeholder="%"
                                      min="0"
                                      max="100"
                                    />
                                    <span className="text-[11px] text-slate-400 font-bold">%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-slate-400 bg-slate-50/10 italic">
                                  ---
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-400 italic">
                                  ---
                                </td>
                                <td className="px-5 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditInvest(idx)}
                                      title="Save Changes"
                                      className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded active:scale-90 transition cursor-pointer"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingInvestIdx(null)}
                                      title="Discard"
                                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded active:scale-90 transition cursor-pointer"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-5 py-3 font-semibold text-slate-700">{inv.partnerName}</td>
                                <td className="px-4 py-3 text-right font-mono text-slate-800">
                                  ₹{inv.investedAmount.toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                                  {inv.profitSharePercent}%
                                </td>
                                <td className={`px-4 py-3 text-right font-mono font-semibold bg-slate-50/20 ${shareOfProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                  {isSold ? `${shareOfProfit >= 0 ? "+" : ""}₹${shareOfProfit.toLocaleString("en-IN")}` : "---"}
                                </td>
                                <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">
                                  ₹{payoutValue.toLocaleString("en-IN")}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditInvest(idx, inv)}
                                      title="Edit details"
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded active:scale-95 transition cursor-pointer"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLiveInvest(idx)}
                                      title="Remove partner link"
                                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded active:scale-90 transition cursor-pointer"
                                    >
                                      <Trash className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Visual equity validation bar */}
                {hasPartners && (
                  <div className={`px-5 py-2.5 text-xs border-y flex items-center justify-between font-medium ${
                    isProfitShareValid 
                      ? "bg-emerald-50/50 border-emerald-100/65 text-emerald-800" 
                      : "bg-rose-50 border-rose-100/65 text-rose-800"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isProfitShareValid ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-bounce"}`} />
                      <span>
                        {isProfitShareValid 
                          ? `Balanced: Total partner profit-shares sum up to exactly 100%.`
                          : `Imbalanced Equity: Partner profit-shares sum to ${totalPartnerSharePercent}% instead of exactly 100%. Please tune shares to ensure exactly 100% split.`
                        }
                      </span>
                    </div>
                    <span className="font-bold font-mono text-[11px]">
                      {totalPartnerSharePercent}% / 100%
                    </span>
                  </div>
                )}

                {/* Add Partner inline form to append inside dossier */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/40">
                  <form onSubmit={handleAddLiveInvest} className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Link Additional Investing Partner</span>
                    
                    {investError && (
                      <span className="text-[10px] text-rose-600 font-semibold block">{investError}</span>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                       <div className="flex-1">
                        {!useCustomNameDetail ? (
                          <select
                            value={newPartnerName}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "OTHER_CUSTOM") {
                                setUseCustomNameDetail(true);
                                setNewPartnerName("");
                              } else {
                                setNewPartnerName(val);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-indigo-500 font-medium"
                            required
                          >
                            <option value="">-- Choose Partner to Link --</option>
                            {partners.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name} (Wallet: ₹{p.walletBalance.toLocaleString("en-IN")})
                              </option>
                            ))}
                            <option value="OTHER_CUSTOM">+ Type a Custom Partner Name...</option>
                          </select>
                        ) : (
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="text"
                              placeholder="Enter Custom Partner Name"
                              value={newPartnerName}
                              onChange={(e) => setNewPartnerName(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-indigo-500 font-medium"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setUseCustomNameDetail(false);
                                setNewPartnerName("");
                              }}
                              className="text-[10px] text-indigo-600 px-2.5 py-1.5 border border-slate-200 bg-white rounded cursor-pointer duration-205 hover:bg-slate-50 font-medium shrink-0"
                              title="Show List"
                            >
                              Show List
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="w-full sm:w-[150px]">
                        <input
                          type="number"
                          placeholder="Contribution ₹"
                          value={newPartnerAmount || ""}
                          onChange={(e) => setNewPartnerAmount(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded text-right font-mono focus:outline-indigo-500"
                          min="0"
                        />
                      </div>
                      <div className="w-full sm:w-[120px] flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Share %"
                          value={newPartnerShare || ""}
                          onChange={(e) => setNewPartnerShare(Number(e.target.value))}
                          className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded text-right font-mono transition focus:outline-none focus:ring-1 ${
                            isProfitShareValid 
                              ? "border-emerald-300 text-emerald-800 focus:ring-emerald-400 focus:border-emerald-400" 
                              : "border-rose-300 text-rose-800 focus:ring-rose-400 focus:border-rose-400 bg-rose-50/5"
                          }`}
                          min="0"
                          max="100"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-700 active:scale-95 transition cursor-pointer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Link Partner
                      </button>
                    </div>

                    {/* Display wallet information available & remainder display */}
                    {newPartnerName && (
                      <div className="text-[10px] font-sans flex flex-wrap gap-2 text-slate-500 pl-2 mt-2 bg-slate-100/40 p-2 rounded border border-slate-100">
                        {(() => {
                          const pObj = partners.find(p => p.name.trim().toLowerCase() === newPartnerName.trim().toLowerCase());
                          if (pObj) {
                            const bal = pObj.walletBalance;
                            const rem = bal - newPartnerAmount;
                            return (
                              <>
                                <span>Wallet Balance Available: <b className="text-slate-700 font-mono">₹{bal.toLocaleString("en-IN")}</b></span>
                                <span>•</span>
                                <span className={rem < 0 ? "text-rose-600 font-semibold text-rose-650" : "text-slate-600"}>
                                  Unused Wallet Remainder: <b className="font-mono">₹{rem.toLocaleString("en-IN")}</b>
                                </span>
                                {newPartnerAmount > 0 && rem >= 0 && (
                                  <span className="text-emerald-650 font-medium flex items-center gap-0.5 sm:ml-auto text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    Apply wallet balance directly (₹{newPartnerAmount.toLocaleString("en-IN")} will be utilized)
                                  </span>
                                )}
                              </>
                            );
                          } else {
                            return (
                              <span className="text-indigo-600 font-medium font-sans">
                                ✨ New Partner Wallet Registry: A wallet will be registered for {newPartnerName} on save.
                              </span>
                            );
                          }
                        })()}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Quick Notes Card */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-accent/80" />
                      Quick Notes & Dossier History
                    </h4>
                    <p className="text-[11px] text-slate-500">Attach persistent text notes or communication logs to this vehicle record.</p>
                  </div>
                  {notesFeedback && (
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded ${notesFeedback.includes("successfully") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {notesFeedback}
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-3.5">
                  <textarea
                    rows={4}
                    placeholder="Type call history, pending repairs, documents status, or other important deal/procurement updates here..."
                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl bg-slate-50/20 focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent font-medium text-slate-800 placeholder-slate-400 leading-relaxed"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                  />
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/50">
                    <span className="text-[10px] text-slate-400 italic">
                      Notes are stored centrally and indexable by search filters.
                    </span>
                    <button
                      type="button"
                      disabled={isSavingNotes}
                      onClick={handleSaveNotes}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition cursor-pointer rounded-lg inline-flex items-center gap-1.5 select-none"
                    >
                      {isSavingNotes ? (
                        <>
                          <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Sticky Note</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: OPERATING EXPENSES */}
          {activeTab === "expenses" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Add Expense Form side */}
                <form onSubmit={handleAddExpense} className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm self-start h-full">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Record Expense Outflow</h4>
                    <p className="text-[11px] text-slate-500">Record vehicle refurbishment, brokage splits or service item details on this car.</p>
                  </div>

                  {expError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{expError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Expense category</label>
                      <select
                        value={expType}
                        onChange={(e) => setExpType(e.target.value as ExpenseType)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-indigo-500 text-slate-700 font-semibold"
                      >
                        <option value="Maintenance Charges">Maintenance Charges</option>
                        <option value="Service Expenses">Service Expenses</option>
                        <option value="Petrol">Petrol / Fuel Charges</option>
                        <option value="Broker Commission">Broker Commission</option>
                        <option value="Legal & Documentation">Legal & Documentation</option>
                        <option value="Other">Other Operational Cost</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cost (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 4500"
                          value={expAmount || ""}
                          onChange={(e) => setExpAmount(Number(e.target.value))}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono focus:outline-indigo-500 text-right"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                        <input
                          type="date"
                          value={expDate}
                          onChange={(e) => setExpDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono focus:outline-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Description / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Engine synthetic lubricant oil replacement, alignment check, billing invoice link etc."
                        value={expDesc}
                        onChange={(e) => setExpDesc(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Costs basis
                    </button>
                  </div>
                </form>

                {/* Ledger Listing side */}
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Costs ledger details</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 border border-amber-100 text-amber-700">
                        Total Expenses: ₹{totalExpenses.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {stagedCar.expenses.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 text-xs italic">
                        No financial expense outlays are currently apportioned to this vehicle ledger.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto no-scrollbar">
                        {stagedCar.expenses.map((exp) => (
                          <div key={exp.id} className="p-4 hover:bg-slate-50/50 flex items-center justify-between gap-4 transition text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                                  {exp.type}
                                </span>
                                <span className="font-mono text-slate-400 text-[10px]">{formatDate(exp.date)}</span>
                              </div>
                              <p className="text-slate-700 font-medium">{exp.description}</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-800 text-[13px]">
                                ₹{exp.amount.toLocaleString("en-IN")}
                              </span>
                              <button
                                onClick={() => handleRemoveExpense(exp.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer active:scale-90"
                                title="Wipe expense"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: DOCUMENTS TRAIL */}
          {activeTab === "documents" && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Specialized Document Slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* SLOT 1: RC BOOK */}
                {(() => {
                  const rcDoc = stagedCar.documents.find(d => d.name.startsWith("[RC_Book]_"));
                  const cleanName = rcDoc ? rcDoc.name.replace("[RC_Book]_", "") : "";
                  return (
                    <div className="bg-white border border-custom-border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm min-h-[145px]">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-accent">Document Slot 1</span>
                          <h4 className="font-bold text-slate-800 text-xs font-sans">RC Book Copy</h4>
                          <p className="text-[10px] text-slate-500 leading-tight">Registration Certificate smartcard scan.</p>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${rcDoc ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      </div>
                      
                      {rcDoc ? (
                        <div className="p-2 bg-slate-50 border border-custom-border rounded-lg flex items-center justify-between text-xs">
                          <span 
                            className="truncate max-w-[110px] font-mono text-[10px] text-slate-800 font-semibold cursor-pointer hover:text-accent hover:underline" 
                            title={cleanName}
                            onClick={() => setPreviewDoc(rcDoc)}
                          >
                            {cleanName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setPreviewDoc(rcDoc)} className="p-1 hover:text-accent select-none cursor-pointer" title="Preview RC copy"><Eye className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" /></button>
                            <button onClick={() => triggerDownloadDocument(rcDoc)} className="p-1 hover:text-accent select-none cursor-pointer" title="Download RC copy"><Download className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteDoc(rcDoc.id)} className="p-1 hover:text-rose-600 select-none cursor-pointer" title="Remove RC copy"><Trash className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-slate-200 hover:border-accent/45 rounded-lg p-2 text-center transition bg-slate-50/50">
                          <input type="file" onChange={(e) => handleSpecialFileUpload(e, "[RC_Book]")} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                          <span className="text-[11px] text-accent font-bold block">Upload RC Book</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">PDF or image scan</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* SLOT 2: PARTNERSHIP AGREEMENT */}
                {(() => {
                  const agreeDoc = stagedCar.documents.find(d => d.name.startsWith("[Agreement]_"));
                  const cleanName = agreeDoc ? agreeDoc.name.replace("[Agreement]_", "") : "";
                  return (
                    <div className="bg-white border border-custom-border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm min-h-[145px]">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-accent">Document Slot 2</span>
                          <h4 className="font-bold text-slate-800 text-xs font-sans">Partnership Agreement</h4>
                          <p className="text-[10px] text-slate-500 leading-tight">Co-investment agreement & legal deed.</p>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${agreeDoc ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      </div>
                      
                      {agreeDoc ? (
                        <div className="p-2 bg-slate-50 border border-custom-border rounded-lg flex items-center justify-between text-xs">
                          <span 
                            className="truncate max-w-[110px] font-mono text-[10px] text-slate-800 font-semibold cursor-pointer hover:text-accent hover:underline" 
                            title={cleanName}
                            onClick={() => setPreviewDoc(agreeDoc)}
                          >
                            {cleanName}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setPreviewDoc(agreeDoc)} className="p-1 hover:text-accent select-none cursor-pointer" title="Preview Agreement Copy"><Eye className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" /></button>
                            <button onClick={() => triggerDownloadDocument(agreeDoc)} className="p-1 hover:text-accent select-none cursor-pointer" title="Download Agreement copy"><Download className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteDoc(agreeDoc.id)} className="p-1 hover:text-rose-600 select-none cursor-pointer" title="Remove Agreement copy"><Trash className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-slate-200 hover:border-accent/45 rounded-lg p-2 text-center transition bg-slate-50/50">
                          <input type="file" onChange={(e) => handleSpecialFileUpload(e, "[Agreement]")} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                          <span className="text-[11px] text-accent font-bold block">Upload Agreement</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">PDF or scanned file</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* SLOT 3: CAR DISPLAY IMAGES GALLERY */}
                {(() => {
                  const imgDocs = stagedCar.documents.filter(d => d.name.startsWith("[Car_Image]_"));
                  return (
                    <div className="bg-white border border-custom-border rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-sm min-h-[145px]">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-accent">Vehicle Graphics</span>
                          <h4 className="font-bold text-slate-800 text-xs font-sans">Car Photo Gallery ({imgDocs.length})</h4>
                          <p className="text-[10px] text-slate-500 leading-tight">Dossier thumbnail & profile images.</p>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${imgDocs.length > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      </div>
                      
                      {imgDocs.length > 0 ? (
                        <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
                          {imgDocs.map((imgDoc) => {
                            const cleanName = imgDoc.name.replace("[Car_Image]_", "");
                            return (
                              <div key={imgDoc.id} className="p-2 bg-slate-50 border border-custom-border rounded-lg flex items-center justify-between text-xs gap-1.5 font-sans">
                                <div 
                                  className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-85"
                                  onClick={() => setPreviewDoc(imgDoc)}
                                >
                                  <img src={imgDoc.base64Data} referrerPolicy="no-referrer" alt="preview" className="h-7 w-10 object-cover rounded border border-custom-border shrink-0" />
                                  <span className="truncate max-w-[85px] font-mono text-[10px] text-slate-650 font-semibold" title={cleanName}>{cleanName}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => setPreviewDoc(imgDoc)} className="p-1 hover:text-accent select-none cursor-pointer" title="Preview photo"><Eye className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" /></button>
                                  <button onClick={() => triggerDownloadDocument(imgDoc)} className="p-1 hover:text-accent select-none cursor-pointer" title="Download image"><Download className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => handleDeleteDoc(imgDoc.id)} className="p-1 hover:text-rose-600 select-none cursor-pointer" title="Remove photo"><Trash className="h-3.5 w-3.5" /></button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Inline Upload More button */}
                          <div className="relative border border-dashed border-slate-200 hover:border-accent/45 rounded-lg p-1 text-center transition bg-slate-50/50 mt-1 cursor-pointer">
                            <input type="file" accept="image/*" multiple onChange={(e) => handleSpecialFileUpload(e, "[Car_Image]")} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                            <span className="text-[10px] text-accent font-bold block">+ Upload More Photos</span>
                          </div>
                        </div>
                      ) : (
                        <div className="relative border border-dashed border-slate-200 hover:border-accent/45 rounded-lg p-2 text-center transition bg-slate-50/50">
                          <input type="file" accept="image/*" multiple onChange={(e) => handleSpecialFileUpload(e, "[Car_Image]")} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                          <span className="text-[11px] text-accent font-bold block">Upload Car Image(s)</span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">JPG, PNG, WebP (select multiple)</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Drag n Drop Upload box for general records */}
                <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                  <div className="p-4 bg-slate-50 text-slate-400 rounded-full border border-slate-100">
                    <FileText className="h-8 w-8" />
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-sans">Other Legal Paper Archive</h4>
                    <p className="text-[11px] text-slate-500 max-w-[280px] mx-auto mt-1 leading-normal font-sans">
                      Upload Registration (RC), Insurance papers, Aadhar cards, Sale covenants, or Maintenance receipts.
                    </p>
                  </div>

                  {docError && (
                    <span className="text-[10px] text-rose-600 font-bold block">{docError}</span>
                  )}

                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      disabled={docLoading}
                      className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                    />
                    <button
                      type="button"
                      disabled={docLoading}
                      className="px-4 py-2 bg-indigo-50 border border-indigo-100 hover:bg-slate-100 transition text-indigo-700 text-xs font-bold rounded-lg cursor-pointer font-sans"
                    >
                      {docLoading ? "Reading Archive..." : 'Select General File (PDF/Image)'}
                    </button>
                  </div>
                </div>

                {/* Uploaded Files grid */}
                <div className="space-y-4">
                  {(() => {
                    const genericDocs = stagedCar.documents.filter(
                      d => !d.name.startsWith("[RC_Book]_") && 
                           !d.name.startsWith("[Agreement]_") && 
                           !d.name.startsWith("[Car_Image]_")
                    );
                    return (
                      <>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">Other attached files ({genericDocs.length})</h4>
                        
                        {genericDocs.length === 0 ? (
                          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-400 text-xs italic font-sans animate-pulse">
                            No general documents attached. Use archive upload.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[180px] overflow-y-auto no-scrollbar pr-1 font-sans">
                            {genericDocs.map((doc) => (
                              <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between gap-3 text-xs hover:border-slate-300">
                                <div 
                                  className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85"
                                  onClick={() => setPreviewDoc(doc)}
                                >
                                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-700 truncate text-[11px] leading-tight hover:text-accent" title={doc.name}>{doc.name}</p>
                                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                      Type: {doc.type.split("/")[1] || "File"} • {new Date(doc.uploadedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-100 rounded transition cursor-pointer"
                                    title="Preview file"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => triggerDownloadDocument(doc)}
                                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-100 rounded transition cursor-pointer"
                                    title="Download document record"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDoc(doc.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer"
                                    title="Wipe record"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: AI SMART ADVISOR */}
          {activeTab === "ai-advisor" && (
            <div className="space-y-5 bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-2xl min-h-[300px] flex flex-col justify-between font-mono">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 fill-current animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase text-slate-300 tracking-widest">Gemini Deal Analyst Portfolio Module</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Automated cognitive underwriting and yield diagnostic evaluation.</p>
                    </div>
                  </div>

                  <button
                    onClick={handleFetchAiAdvisor}
                    disabled={aiLoading}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition disabled:opacity-50 cursor-pointer text-sans"
                  >
                    {aiLoading ? "Consulting AI..." : "Begin Diagnosis"}
                  </button>
                </div>

                {/* Report Section */}
                {aiLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="h-8 w-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="space-y-1 block text-center max-w-[400px]">
                      <p className="text-slate-300 text-xs animate-pulse">Reapportioning capitalization splits...</p>
                      <p className="text-[9px] text-slate-500">Evaluating broker commissions and vehicle maintenance profiles against target local benchmarks...</p>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="p-4 bg-rose-950/40 border border-rose-900/50 text-rose-400 rounded text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5"><AlertCircle className="h-4 w-4" /> AI Evaluation Aborted:</p>
                    <p className="text-[11px] font-mono leading-relaxed">{aiError}</p>
                  </div>
                ) : aiReport ? (
                  <div className="text-xs leading-relaxed space-y-4 markdown-body font-sans text-slate-300 max-h-[400px] overflow-y-auto no-scrollbar py-2">
                    <ReactMarkdown>{aiReport}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3 max-w-[450px] mx-auto text-slate-500">
                    <p className="text-xs">No active underwriting brief loaded. Click **Begin Diagnosis** to run our server proxy Gemini model across this vehicle purchase date, invest balances, and maintenance costs.</p>
                    <p className="text-[10px] text-slate-600">This secure procedure utilizes standard telemetry matching to review exit targets without browser secrets disclosure.</p>
                  </div>
                )}
              </div>

              {/* Console Footing */}
              <div className="text-[9px] border-t border-slate-800 pt-3 text-slate-600 flex items-center justify-between">
                <span>Model: `gemini-3.5-flash`</span>
                <span>Telemetry: `aistudio-build-client`</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 4. Document Preview Modal Overlay */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{previewDoc.name.replace(/^\[(RC_Book|Agreement|Car_Image)\]_/, "")}</h3>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {previewDoc.type} • {new Date(previewDoc.uploadedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerDownloadDocument(previewDoc)}
                  className="p-1.5 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto bg-slate-100 flex items-center justify-center min-h-[400px]">
              {previewDoc.type.startsWith("image/") || previewDoc.base64Data.startsWith("data:image/") ? (
                <img 
                  src={previewDoc.base64Data} 
                  referrerPolicy="no-referrer" 
                  alt={previewDoc.name} 
                  className="max-w-full max-h-[65vh] object-contain rounded shadow-lg"
                />
              ) : previewDoc.type === "application/pdf" || previewDoc.base64Data.startsWith("data:application/pdf") ? (
                <iframe 
                  src={previewDoc.base64Data} 
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded bg-white shadow-lg border border-slate-200"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700">Preview not supported for this file type</p>
                  <p className="text-xs text-slate-500">Please download the document to view its contents.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
