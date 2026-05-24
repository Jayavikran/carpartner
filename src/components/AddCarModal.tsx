import React, { useState } from "react";
import { Car, PartnerInvestment, CarStatus, Partner } from "../types";
import { X, Plus, Trash2, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface AddCarModalProps {
  onClose: () => void;
  onSubmit: (carData: Partial<Car>) => void;
  partners?: Partner[];
  onRefreshPartners?: () => void;
}

export default function AddCarModal({ onClose, onSubmit, partners = [] }: AddCarModalProps) {
  // Main form fields
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [sellerDetails, setSellerDetails] = useState("");
  const [status, setStatus] = useState<CarStatus>("Purchased");

  // Partners investment state
  const [investments, setInvestments] = useState<PartnerInvestment[]>([]);
  // Records inline selection for custom input fields if dropdown chooses other
  const [useCustomNameRow, setUseCustomNameRow] = useState<{ [key: number]: boolean }>({});

  // Validation feedback
  const [errorString, setErrorString] = useState("");

  const handleAddPartnerRow = () => {
    setInvestments((prev) => [
      ...prev,
      { partnerName: "", investedAmount: 0, profitSharePercent: 50 }, // defaults to 50% automatically!
    ]);
  };

  const handleRemovePartnerRow = (idx: number) => {
    setInvestments((prev) => prev.filter((_, i) => i !== idx));
    setUseCustomNameRow((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const handlePartnerFieldChange = (idx: number, field: keyof PartnerInvestment, value: any) => {
    setInvestments((prev) => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        [field]: field === "partnerName" ? value : Number(value),
      };
      return copy;
    });
  };

  // UX Helper: Split investment amounts and profit shares evenly among connected partners
  const triggerMatchAmountSplit = () => {
    if (investments.length === 0) return;
    const shareCount = investments.length;
    const splitPrice = Math.round(purchaseAmount / shareCount);
    const splitShare = Number((100 / shareCount).toFixed(1));

    setInvestments((prev) =>
      prev.map((p) => ({
        ...p,
        investedAmount: splitPrice,
        profitSharePercent: splitShare,
      }))
    );
  };

  // Financial sanity calculations
  const totalPartnerAmountAdded = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalPartnerSharePercent = investments.reduce((sum, inv) => sum + inv.profitSharePercent, 0);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorString("");

    if (!vehicleNumber.trim()) {
      setErrorString("Registration vehicle plate number is required.");
      return;
    }
    if (!makeModel.trim()) {
      setErrorString("Make & Model description is required (e.g., Hyundai Elite i20).");
      return;
    }
    if (purchaseAmount <= 0) {
      setErrorString("Purchase price outlay must be greater than zero.");
      return;
    }

    // Checking partner share constraints if partners are added
    if (investments.length > 0) {
      const blankNames = investments.some((i) => !i.partnerName.trim());
      if (blankNames) {
        setErrorString("Please provide a valid name for all listed partners.");
        return;
      }

      // Fix amount invested error: force total partner investments to equal the car purchase amount
      if (Math.abs(totalPartnerAmountAdded - purchaseAmount) > 1.0) {
        setErrorString(`The total of all partner investments (₹${totalPartnerAmountAdded.toLocaleString("en-IN")}) must equal the car purchase price (₹${purchaseAmount.toLocaleString("en-IN")}). Settle the variance first.`);
        return;
      }

      // Check sum of percentages
      // Accept minor rounding margins like 99.8% to 100.2% due to division factors
      if (Math.abs(totalPartnerSharePercent - 100) > 0.5) {
        setErrorString(`Total profit split percentage must equal exactly 100%. Currently it is ${totalPartnerSharePercent}%. Please adjust shares.`);
        return;
      }
    }

    onSubmit({
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      makeModel: makeModel.trim(),
      purchaseDate,
      purchaseAmount,
      sellerDetails: sellerDetails.trim() || "Dealer Sourced",
      status,
      investments,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-scrollbar">
      <div className="bg-white border border-custom-border rounded-xl w-full max-w-2xl shadow-xl overflow-hidden my-2 sm:my-8 select-none">
        
         {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-bg border-b border-custom-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-ink text-sm sm:text-base">Procure New Vehicle</h3>
            <p className="text-[11px] sm:text-xs text-muted">Initiate a new used-car investment partnership pool.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-ink active:scale-90 transition cursor-pointer col-p"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmitForm} className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto no-scrollbar">
          
          {errorString && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorString}</span>
            </div>
          )}

          {/* Section 1: Vehicle Profile */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Section 1: Vehicle Specifications</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Registration/Number Plate <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-QA-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg uppercase font-mono text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Make & Model spec <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Hyundai i20 Prime Petrol Sportz (2019)"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg text-ink"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Purchase Date <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg font-mono text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Purchase Cost (INR ₹) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  placeholder="Purchase cost"
                  value={purchaseAmount || ""}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg font-mono text-ink"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Current Vehicle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CarStatus)}
                  className="w-full px-3 py-2 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg font-medium text-ink"
                >
                  <option value="Purchased">Purchased</option>
                  <option value="In Service">In Service (Refurbishing)</option>
                  <option value="Showroom Ready">Showroom Ready</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Seller details & notes</label>
              <textarea
                placeholder="Name, telephone number, previous owners, physical condition reports..."
                rows={2}
                value={sellerDetails}
                onChange={(e) => setSellerDetails(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg text-ink"
              />
            </div>
          </div>

          {/* Section 2: Partners Setup */}
          <div className="space-y-4 pt-4 border-t border-custom-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Section 2: Dealership Partner Amounts</h4>
                <p className="text-[11px] text-muted">Add operational partners investing in this specific car deal.</p>
              </div>
              
              <div className="flex gap-2">
                {investments.length > 0 && (
                  <button
                    type="button"
                    onClick={triggerMatchAmountSplit}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover bg-blue-50/70 px-2 py-1 rounded cursor-pointer transition-all"
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    Split Amount Evenly
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddPartnerRow}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 hover:text-ink border border-custom-border bg-white px-2 py-1 rounded hover:bg-bg cursor-pointer transition-all"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  Add Partner
                </button>
              </div>
            </div>

            {investments.length === 0 ? (
              <div className="p-4 border border-dashed border-custom-border rounded-lg text-center text-muted text-xs py-6">
                No funding partners explicitly linked yet. You can insert them later inside the management console.
              </div>
            ) : (
              <div className="space-y-3">
                {investments.map((inv, idx) => {
                  const matchingPartner = partners.find(
                    (p) => p.name.trim().toLowerCase() === inv.partnerName.trim().toLowerCase()
                  );
                  const walletBalance = matchingPartner ? matchingPartner.walletBalance : null;
                  const remainingBalance = walletBalance !== null ? walletBalance - inv.investedAmount : null;

                  return (
                    <div key={idx} className="flex flex-col gap-2 bg-bg/50 p-3 rounded-lg border border-custom-border">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5 sm:hidden">Partner Name</label>
                          {!useCustomNameRow[idx] ? (
                            <select
                              value={inv.partnerName}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "OTHER_CUSTOM") {
                                  setUseCustomNameRow((p) => ({ ...p, [idx]: true }));
                                  handlePartnerFieldChange(idx, "partnerName", "");
                                } else {
                                  handlePartnerFieldChange(idx, "partnerName", val);
                                }
                              }}
                              className="w-full px-2.5 py-1.5 text-xs border border-custom-border rounded bg-white text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                              required
                            >
                              <option value="">-- Choose Partner --</option>
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
                                placeholder="Enter New Partner Name"
                                value={inv.partnerName}
                                onChange={(e) => handlePartnerFieldChange(idx, "partnerName", e.target.value)}
                                className="flex-1 px-2.5 py-1.5 text-xs border border-custom-border rounded bg-white text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setUseCustomNameRow((p) => ({ ...p, [idx]: false }));
                                  handlePartnerFieldChange(idx, "partnerName", "");
                                }}
                                className="text-[10px] text-accent px-2 py-1.5 border border-custom-border bg-white rounded cursor-pointer duration-200"
                                title="Choose from list"
                              >
                                Show List
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="w-full sm:w-[150px]">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5 sm:hidden">Amount Invested (₹)</label>
                          <input
                            type="number"
                            placeholder="Amount Contributed ₹"
                            value={inv.investedAmount || ""}
                            onChange={(e) => handlePartnerFieldChange(idx, "investedAmount", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-custom-border rounded bg-white text-ink font-mono text-right focus:outline-none focus:ring-1 focus:ring-accent"
                            min="0"
                            required
                          />
                        </div>

                        <div className="w-full sm:w-[110px] flex items-center gap-1">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-0.5 sm:hidden">Share (%)</label>
                            <input
                              type="number"
                              placeholder="Profit Share %"
                              value={inv.profitSharePercent || ""}
                              onChange={(e) => handlePartnerFieldChange(idx, "profitSharePercent", e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs border border-custom-border rounded bg-white text-ink font-mono text-right focus:outline-none focus:ring-1 focus:ring-accent"
                              min="0"
                              max="100"
                              required
                            />
                          </div>
                          <span className="text-muted text-xs">%</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePartnerRow(idx)}
                          className="p-1.5 bg-white border border-rose-100 text-rose-500 rounded hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer self-end sm:self-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Display available wallet balance and remainder unused balance */}
                      {inv.partnerName && (
                        <div className="text-[10px] font-sans flex flex-wrap gap-2 text-slate-500 pl-0.5">
                          {walletBalance !== null ? (
                            <>
                              <span>Wallet Balance: <b className="text-slate-700 font-mono">₹{walletBalance.toLocaleString("en-IN")}</b></span>
                              <span>•</span>
                              <span className={remainingBalance !== null && remainingBalance < 0 ? "text-rose-600 font-semibold" : ""}>
                                Unused Wallet Remainder: <b className="font-mono">₹{remainingBalance?.toLocaleString("en-IN")}</b>
                              </span>
                              {inv.investedAmount > 0 && remainingBalance !== null && remainingBalance >= 0 && (
                                <span className="text-emerald-600 font-medium flex items-center gap-0.5 sm:ml-auto">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  Apply existing balance directly (₹{inv.investedAmount.toLocaleString("en-IN")} will be utilized)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-blue-600 font-medium font-sans">
                              ✨ New Partner wallet registry: {inv.partnerName} will be initialized on submit.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Split summary indicators */}
                <div className="bg-bg/70 p-3 rounded-lg border border-custom-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
                  <div className="flex items-center gap-4">
                    <span>Total Partner Money: <b className="font-mono text-ink font-bold">₹{totalPartnerAmountAdded.toLocaleString("en-IN")}</b></span>
                    <span>Total Shares: <b className={`font-mono font-bold ${totalPartnerSharePercent === 100 ? "text-emerald-600" : "text-rose-500"}`}>{totalPartnerSharePercent}%</b></span>
                  </div>
                  {totalPartnerAmountAdded !== purchaseAmount && (
                    <div className="text-[10px] text-accent font-semibold flex items-center gap-1">
                      <span>Amount variance: ₹{(purchaseAmount - totalPartnerAmountAdded).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-custom-border flex items-center justify-end gap-3.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-ink hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
            >
              Create Deal Folder
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
