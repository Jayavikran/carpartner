import React, { useMemo, useState } from "react";
import { Car, CarStatus } from "../types";
import CarCard from "./CarCard";
import { SlidersHorizontal, Search, RefreshCw, Layers, Printer, History, X, Lock } from "lucide-react";

interface VehiclesTabProps {
  cars: Car[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectCar: (carId: string) => void;
  onDeleteCar: (carId: string) => void;
  onOpenAdvisor: (car: Car) => void;
  onTriggerPrint: (car: Car) => void;
  onUpdateCar: (carId: string, updatedFields: Partial<Car>) => Promise<void>;
  allPartners: string[];
  isAdmin: boolean;
  onTriggerAdminLogin: () => void;
}

export default function VehiclesTab({
  cars,
  isLoading,
  onRefresh,
  onSelectCar,
  onDeleteCar,
  onOpenAdvisor,
  onTriggerPrint,
  onUpdateCar,
  allPartners,
  isAdmin,
  onTriggerAdminLogin
}: VehiclesTabProps) {
  // Search & Filters State
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [datePreset, setDatePreset] = useState("ALL");

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === "ALL") {
      setStartDateFilter("");
      setEndDateFilter("");
    } else if (preset === "2026") {
      setStartDateFilter("2026-01-01");
      setEndDateFilter("2026-12-31");
    } else if (preset === "2025") {
      setStartDateFilter("2025-01-01");
      setEndDateFilter("2025-12-31");
    } else if (preset === "Q1_2026") {
      setStartDateFilter("2026-01-01");
      setEndDateFilter("2026-03-31");
    } else if (preset === "Q2_2026") {
      setStartDateFilter("2026-04-01");
      setEndDateFilter("2026-06-30");
    } else if (preset === "Q3_2026") {
      setStartDateFilter("2026-07-01");
      setEndDateFilter("2026-09-30");
    } else if (preset === "Q4_2026") {
      setStartDateFilter("2026-10-01");
      setEndDateFilter("2026-12-31");
    } else if (preset === "Q1_2025") {
      setStartDateFilter("2025-01-01");
      setEndDateFilter("2025-03-31");
    } else if (preset === "Q2_2025") {
      setStartDateFilter("2025-04-01");
      setEndDateFilter("2025-06-30");
    } else if (preset === "Q3_2025") {
      setStartDateFilter("2025-07-01");
      setEndDateFilter("2025-09-30");
    } else if (preset === "Q4_2025") {
      setStartDateFilter("2025-10-01");
      setEndDateFilter("2025-12-31");
    }
  };

  // Recent Searches lists matching search logs
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("carpartner_recent_searches");
      return saved ? JSON.parse(saved) : ["Swift", "Innova", "Fortuner"];
    } catch {
      return ["Swift", "Innova", "Fortuner"];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  const saveSearchQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 3);
      try {
        localStorage.setItem("carpartner_recent_searches", JSON.stringify(updated));
      } catch (e) {
        console.error("LS Storage warning: custom search logs cannot be written", e);
      }
      return updated;
    });
  };

  // Compute pending partner payouts across the portfolio
  const overdueDealsCount = useMemo(() => {
    return cars.filter(c => c.status === "Sold" && c.investments.length > 0 && !c.payoutsProcessed).length;
  }, [cars]);

  const unsettledCars = useMemo(() => {
    return cars.filter(c => c.status === "Sold" && c.investments.length > 0 && !c.payoutsProcessed);
  }, [cars]);

  // Formal Settlement Approval States
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedCarToSettle, setSelectedCarToSettle] = useState<Car | null>(null);
  const [approvedChecked, setApprovedChecked] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.strokeStyle = "#1e1b4b"; // deep indigo
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  // Bulk status update states
  const [selectedCarIds, setSelectedCarIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("ALL");
    setPartnerFilter("ALL");
    setStartDateFilter("");
    setEndDateFilter("");
    setDatePreset("ALL");
    setSelectedCarIds(new Set());
  };

  const handleExportPDF = () => {
    const params = new URLSearchParams();
    if (searchText) params.append("searchText", searchText);
    if (statusFilter !== "ALL") params.append("statusFilter", statusFilter);
    if (partnerFilter !== "ALL") params.append("partnerFilter", partnerFilter);
    if (startDateFilter) params.append("startDateFilter", startDateFilter);
    if (endDateFilter) params.append("endDateFilter", endDateFilter);

    window.location.href = `/api/reports/filtered-vehicles-pdf?${params.toString()}`;
  };

  // Combined Search & Filtering logic
  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      // 1. Keyword search (Supporting out-of-order partial matching of words/segments)
      const searchTerms = searchText.toLowerCase().split(/\s+/).filter(Boolean);
      const matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
        const vehicleNum = car.vehicleNumber.toLowerCase();
        const makeModel = car.makeModel.toLowerCase();
        const seller = (car.sellerDetails || "").toLowerCase();
        const buyer = (car.buyerDetails || "").toLowerCase();
        const delivery = (car.deliveryInfo || "").toLowerCase();
        const notes = (car.notes || "").toLowerCase();
        const hasMatchingExpense = car.expenses.some(exp => 
          exp.description.toLowerCase().includes(term) || 
          exp.type.toLowerCase().includes(term)
        );

        return (
          vehicleNum.includes(term) ||
          makeModel.includes(term) ||
          seller.includes(term) ||
          buyer.includes(term) ||
          delivery.includes(term) ||
          notes.includes(term) ||
          hasMatchingExpense
        );
      });

      // 2. Status filter
      const matchesStatus = statusFilter === "ALL" || car.status === statusFilter;

      // 3. Partner filter
      const matchesPartner = 
        partnerFilter === "ALL" || 
        car.investments.some(inv => inv.partnerName.trim() === partnerFilter);

      // 4. Date Range filter (filter by purchaseDate span YYYY-MM-DD)
      let matchesRange = true;
      if (startDateFilter && car.purchaseDate < startDateFilter) {
        matchesRange = false;
      }
      if (endDateFilter && car.purchaseDate > endDateFilter) {
        matchesRange = false;
      }

      return matchesSearch && matchesStatus && matchesPartner && matchesRange;
    });
  }, [cars, searchText, statusFilter, partnerFilter, startDateFilter, endDateFilter]);

  // Selections togglers
  const toggleSelectCar = (carId: string) => {
    setSelectedCarIds(prev => {
      const copy = new Set(prev);
      if (copy.has(carId)) {
        copy.delete(carId);
      } else {
        copy.add(carId);
      }
      return copy;
    });
  };

  const isAllFilteredSelected = useMemo(() => {
    return filteredCars.length > 0 && filteredCars.every(car => selectedCarIds.has(car.id));
  }, [filteredCars, selectedCarIds]);

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedCarIds(prev => {
        const copy = new Set(prev);
        filteredCars.forEach(car => copy.delete(car.id));
        return copy;
      });
    } else {
      setSelectedCarIds(prev => {
        const copy = new Set(prev);
        filteredCars.forEach(car => copy.add(car.id));
        return copy;
      });
    }
  };

  const handleBulkStatusUpdate = async (status: CarStatus) => {
    if (selectedCarIds.size === 0) return;
    if (!isAdmin) {
      alert("Administrative authorization is required to perform bulk status updates.");
      onTriggerAdminLogin();
      return;
    }

    const isConfirmed = window.confirm(`Are you sure you want to update the status of ${selectedCarIds.size} selected vehicle records to "${status}"? This action will apply to all selected database files.`);
    if (!isConfirmed) return;

    let extraFields: Partial<Car> = { status };
    if (status === "Sold") {
      const enteredAmountStr = prompt("Enter Sale Amount (₹) to register for the selected sold vehicles. All selected vehicle deal exit records will be closed at this exit rate:");
      if (enteredAmountStr === null) return;
      const enteredAmount = parseFloat(enteredAmountStr);
      if (!isNaN(enteredAmount) && enteredAmount > 0) {
        extraFields.saleAmount = enteredAmount;
        extraFields.saleDate = new Date().toISOString().substring(0, 10);
      } else {
        alert("Invalid sale exit amount. Settle sold deals individually if custom sale price is needed.");
        return;
      }
    }

    setIsBulkUpdating(true);
    try {
      const idsArray = Array.from(selectedCarIds);
      await Promise.all(idsArray.map(id => onUpdateCar(id, extraFields)));
      setSelectedCarIds(new Set());
      alert(`Bulk Status successfully updated to "${status}" for ${idsArray.length} vehicles.`);
    } catch (e) {
      console.error(e);
      alert("Bulk status update warning: some database entries could not be updated.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtering & Search panel */}
      <section className="bg-white p-6 rounded-xl border border-custom-border space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between gap-2 border-b border-custom-border pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted" />
            <h3 className="font-semibold text-ink text-xs uppercase tracking-wider">Search & Dossier Filters</h3>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs text-accent hover:text-accent-hover font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Keyword field */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1 flex justify-between items-center">
              <span>Keyword / Plate</span>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center gap-1 text-[9px] text-indigo-600 hover:text-indigo-700 font-bold transition cursor-pointer"
                  title="Toggle Recent Searches"
                >
                  <History className="h-2.5 w-2.5 text-indigo-500" />
                  <span>Recent</span>
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Insert Plate No / model specs..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    saveSearchQuery(searchText);
                  }
                }}
                onBlur={() => {
                  saveSearchQuery(searchText);
                }}
                className="w-full pl-9 pr-8 py-1.5 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg text-ink"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />

              {showHistory && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowHistory(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-custom-border rounded-lg shadow-md py-1 z-40 text-[11px] font-sans">
                    <div className="px-2.5 py-1 text-[9px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                      Recent Search Logs
                    </div>
                    {recentSearches.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur from closing it immediately
                          setSearchText(q);
                          setShowHistory(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-between gap-1.5 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <History className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{q}</span>
                        </div>
                        <span className="text-[9px] font-bold bg-slate-100 px-1 py-0.25 text-slate-500 rounded font-sans uppercase">Quick apply</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Refurbishment/Deal state</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg text-ink font-medium"
            >
              <option value="ALL">All Refurbish states</option>
              <option value="Purchased">Purchased</option>
              <option value="In Service">In Service (Refurbishing)</option>
              <option value="Showroom Ready">Showroom Ready</option>
              <option value="Sold">Sold Deal Closed</option>
            </select>
          </div>

          {/* Partner filter */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Equity Holder</label>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-custom-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent bg-bg text-ink font-medium"
            >
              <option value="ALL">All Dealership Partners</option>
              {allPartners.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Date acquired filter */}
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Quarter & Year Preset</label>
            <select
              value={datePreset}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-custom-border rounded-lg bg-bg text-ink font-bold focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="ALL">All Available Dates</option>
              <option value="2026">Full Year 2026</option>
              <option value="2025">Full Year 2025</option>
              <optgroup label="Quarter Segments 2026">
                <option value="Q1_2026">Q1 2026 (Jan - Mar)</option>
                <option value="Q2_2026">Q2 2026 (Apr - Jun)</option>
                <option value="Q3_2026">Q3 2026 (Jul - Sep)</option>
                <option value="Q4_2026">Q4 2026 (Oct - Dec)</option>
              </optgroup>
              <optgroup label="Quarter Segments 2025">
                <option value="Q1_2025">Q1 2025 (Jan - Mar)</option>
                <option value="Q2_2025">Q2 2025 (Apr - Jun)</option>
                <option value="Q3_2025">Q3 2025 (Jul - Sep)</option>
                <option value="Q4_2025">Q4 2025 (Oct - Dec)</option>
              </optgroup>
              <option value="CUSTOM">Custom Range Span</option>
            </select>
          </div>
        </div>

        {/* Start Date & End Date manual adjustments secondary filters row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-3.5 border-t border-dashed border-slate-200 bg-slate-50/50 p-3 rounded-lg">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span>Visual Date Range Boundaries:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">From:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="px-2.5 py-1 text-xs border border-custom-border rounded bg-white font-mono text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase">To:</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setDatePreset("CUSTOM");
                }}
                className="px-2.5 py-1 text-xs border border-custom-border rounded bg-white font-mono text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
          {(startDateFilter || endDateFilter) && (
            <button
              type="button"
              onClick={() => {
                setStartDateFilter("");
                setEndDateFilter("");
                setDatePreset("ALL");
              }}
              className="text-[10.5px] font-extrabold text-rose-600 hover:text-rose-700 underline cursor-pointer hover:no-underline transition sm:ml-auto"
            >
              Clear Bounds
            </button>
          )}
        </div>
      </section>

      {/* Content grid */}
      <section className="space-y-4">
        {overdueDealsCount > 0 && (
          <button
            type="button"
            onClick={() => {
              const firstUnsettled = unsettledCars[0] || null;
              setSelectedCarToSettle(firstUnsettled);
              setShowSettleModal(true);
              setApprovedChecked(false);
              setTypedSignature("");
              setSignatureDataUrl(null);
              setTimeout(() => {
                clearSignature();
              }, 100);
            }}
            className="w-full text-left p-3.5 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 rounded-xl flex items-center justify-between gap-3 text-[11.5px] font-semibold text-rose-700 font-sans shadow-2xs transition group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600 shrink-0 animate-pulse group-hover:scale-110" />
              <p className="font-bold">
                ⚠️ Settlement Alert: {overdueDealsCount} closed deal{overdueDealsCount > 1 ? "s" : ""} have co-investor payouts pending verification! Click to review & sign settlement.
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold bg-white text-rose-700 px-3 py-1.5 border border-rose-250 rounded-lg shadow-3xs hover:bg-rose-50 transition shrink-0">
              Action Required
            </span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-custom-border pb-3">
          <div>
            <h3 className="font-semibold text-ink text-sm uppercase tracking-wider">Active Deals Folder ({filteredCars.length})</h3>
            <span className="text-muted text-[11px] font-sans">Showing search specific matches</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Export Filtered list vehicles as formatted PDF */}
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer transition active:scale-95 shadow-xs whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              <span>Export Filtered PDF</span>
            </button>

            {/* Select All Toggle Checkbox */}
            {filteredCars.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-650 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="font-semibold text-[11px] uppercase tracking-wide">Select All</span>
              </label>
            )}

            {/* Bulk Update Status Dropdown Menu */}
            {selectedCarIds.size > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-150 px-3 py-1.5 rounded-lg animate-fade-in shadow-xs">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-tight">
                  {selectedCarIds.size} Selected
                </span>
                <span className="text-indigo-300">|</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Bulk State:</span>
                <select
                  disabled={isBulkUpdating}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      handleBulkStatusUpdate(val as CarStatus);
                      e.target.value = ""; // Reset dropdown selection back to placeholder
                    }
                  }}
                  className="bg-white border border-indigo-200 rounded text-xs px-2 py-0.5 text-slate-750 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Choose status...</option>
                  <option value="Purchased">Sourced</option>
                  <option value="In Service">In Workshop</option>
                  <option value="Showroom Ready">Showroom</option>
                  <option value="Sold">Sold</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3.5">
            <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-muted text-xs font-semibold animate-pulse">Syncing vehicle ledgers from database...</span>
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="py-20 text-center bg-white border border-custom-border border-dashed rounded-xl space-y-4 p-6">
            <div className="p-4 bg-bg rounded-lg text-muted border border-custom-border inline-block">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-medium text-ink text-sm">No vehicle dossiers found</h4>
              <p className="text-xs text-muted max-w-[280px] mx-auto mt-1">Try resetting the filters, search keyword or add a new vehicle record.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map(car => (
              <CarCard
                key={car.id}
                car={car}
                onViewDetails={onSelectCar}
                onDeleteCar={(id) => {
                  if (!isAdmin) {
                    alert("Administrative authorization is required to delete inventory dossiers.");
                    onTriggerAdminLogin();
                  } else {
                    onDeleteCar(id);
                  }
                }}
                onOpenAdvisor={onOpenAdvisor}
                onTriggerPrint={onTriggerPrint}
                onUpdateCar={onUpdateCar}
                isSelected={selectedCarIds.has(car.id)}
                onToggleSelect={() => toggleSelectCar(car.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Bottom Status Tag Legend */}
      <section className="bg-slate-50 border border-custom-border rounded-xl p-5 space-y-3 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-indigo-500" />
          <span>Vehicle Status Color-Coded Tag Legend & Definitions</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Purchased / Sourced */}
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex items-start gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 mt-1 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-slate-800 uppercase block">Sourced (Purchased)</span>
              <p className="text-[11px] text-muted leading-tight mt-0.5 font-sans">
                Vehicle has been negotiated and purchased from seller, awaiting garage level checks.
              </p>
            </div>
          </div>

          {/* In Service */}
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex items-start gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase block">In Workshop (In Service)</span>
              <p className="text-[11px] text-muted leading-tight mt-0.5 font-sans">
                Active cosmetic, mechanical cleaning, testing, or refurbishment measures are underway.
              </p>
            </div>
          </div>

          {/* Showroom Ready */}
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex items-start gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 mt-1 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-indigo-650 uppercase block">Showroom Ready</span>
              <p className="text-[11px] text-muted leading-tight mt-0.5 font-sans">
                Workshop processes complete. Car is placed in showroom and marketed for sale.
              </p>
            </div>
          </div>

          {/* Sold */}
          <div className="bg-white border border-slate-200/60 p-3 rounded-lg flex items-start gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase block">Sold (Closed)</span>
              <p className="text-[11px] text-muted leading-tight mt-0.5 font-sans">
                Asset sold to end-buyer. Deals closed and payouts are ready for final ledger settlements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Formal Settlement Approval Confirmation Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="bg-white border border-slate-350 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col p-6 text-slate-800">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-950 text-base uppercase tracking-wide border-0 pt-0">
                  Formal Deal Settlement Approval
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Disbursement ledger approval & digital execution contract sign-off</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettleModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Select Unsettled Portfolio Deal
                </label>
                <select
                  value={selectedCarToSettle?.id || ""}
                  onChange={(e) => {
                    const carId = e.target.value;
                    const c = unsettledCars.find(x => x.id === carId) || null;
                    setSelectedCarToSettle(c);
                    setApprovedChecked(false);
                    setTypedSignature("");
                    setSignatureDataUrl(null);
                    setTimeout(() => {
                      clearSignature();
                    }, 100);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>Select vehicle...</option>
                  {unsettledCars.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.makeModel} ({c.vehicleNumber}) - Pending Release
                    </option>
                  ))}
                </select>
              </div>

              {selectedCarToSettle ? (
                <>
                  {/* Financial calculation summary cards */}
                  {(() => {
                    const car = selectedCarToSettle;
                    const totalExpenses = car.expenses.reduce((s, e) => s + e.amount, 0);
                    const costBasis = car.purchaseAmount + totalExpenses;
                    const profit = (car.saleAmount || 0) - costBasis;
                    
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3.5 text-xs">
                        <div className="flex justify-between items-center text-[11px] border-b border-slate-200/60 pb-2">
                          <span className="font-bold text-slate-550 uppercase">Deal Summary ({car.vehicleNumber})</span>
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded border border-indigo-150 font-black">
                            ₹{(car.saleAmount || 0).toLocaleString("en-IN")} Sale Price
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3.5 text-[11.5px] font-sans">
                          <div>
                            <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Purchase Outlay</span>
                            <span className="font-bold text-slate-700 font-mono">₹{car.purchaseAmount.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Amortized Refurbishment</span>
                            <span className="font-bold text-slate-700 font-mono">₹{totalExpenses.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Total Cost Basis</span>
                            <span className="font-bold text-slate-700 font-mono">₹{costBasis.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Net Deal Profit</span>
                            <span className={`font-black font-mono ${profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              ₹{profit.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Partner Dividends Breakdown Grid */}
                        <div className="space-y-2 border-t border-slate-200/60 pt-3">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Co-Investor Disbursement Matrix</span>
                          <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                            {car.investments.map((inv, idx) => {
                              const shareOfProfit = (profit * inv.profitSharePercent) / 100;
                              const payout = inv.investedAmount + shareOfProfit;
                              return (
                                <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 hover:border-slate-250 transition text-[11.5px]">
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-800 block truncate">{inv.partnerName}</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">Capital: ₹{inv.investedAmount.toLocaleString("en-IN")} ({inv.profitSharePercent}% Share)</span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-slate-900 font-mono block">₹{payout.toLocaleString("en-IN")}</span>
                                    <span className="text-[9.5px] font-semibold text-emerald-600 block mt-0.5">Yield: ₹{shareOfProfit.toLocaleString("en-IN")}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FORM INPUTS */}
                  {!isAdmin ? (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
                        <div className="mx-auto h-12 w-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                          <Lock className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                            🔒 Administrative Seal Required
                          </h4>
                          <p className="text-slate-500 text-[11px] leading-relaxed max-w-sm mx-auto">
                            Signing legal settlement certificates and committing partner cash capital payouts is reserved for verified system administrators.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onTriggerAdminLogin}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition active:scale-95 inline-flex items-center gap-1.5"
                        >
                          Authenticate Admin Password
                        </button>
                      </div>

                      {/* Cancel only button */}
                      <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowSettleModal(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer active:scale-95 flex-1 text-center"
                        >
                          Close Modal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {/* Checkbox verification */}
                        <label className="flex items-start gap-3 text-xs text-slate-650 cursor-pointer select-none bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-100/60 hover:bg-indigo-50/40 transition">
                          <input
                            type="checkbox"
                            checked={approvedChecked}
                            onChange={(e) => setApprovedChecked(e.target.checked)}
                            className="h-4.5 w-4.5 mt-0.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="font-semibold text-[11px] leading-snug text-slate-700">
                            I hereby declare that I have audited and approved the partner payout ratios and net dividend amounts calculated herein. I confirm co-investors will be settled accordingly and this dossier closed.
                          </span>
                        </label>

                        {/* Signature pad & Typed Signature */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Typed Signature */}
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                              Type Full Name to Certify
                            </label>
                            <input
                              type="text"
                              placeholder="Type your name..."
                              value={typedSignature}
                              onChange={(e) => setTypedSignature(e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 bg-slate-50 text-slate-800 font-bold"
                            />
                          </div>

                          {/* Canvas Pad */}
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                                Draw Digital Signature
                              </label>
                              <button
                                type="button"
                                onClick={clearSignature}
                                className="text-[9.5px] font-extrabold text-rose-600 hover:text-rose-700 cursor-pointer"
                              >
                                Clear Signature Pad
                              </button>
                            </div>
                            <div className="border border-slate-200 rounded-lg bg-slate-50 overflow-hidden h-24 relative select-none">
                              <canvas
                                ref={canvasRef}
                                width={240}
                                height={96}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-full cursor-crosshair bg-slate-50 select-none block"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions buttons */}
                      <div className="flex gap-2.5 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowSettleModal(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer active:scale-95 flex-1 text-center"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingSettle || !approvedChecked || !typedSignature || !signatureDataUrl}
                          onClick={async () => {
                            const car = selectedCarToSettle;
                            if (!car) return;
                            setIsSubmittingSettle(true);
                            try {
                              await onUpdateCar(car.id, { payoutsProcessed: true });
                              setShowSettleModal(false);
                              alert(`Success! ${car.makeModel} (${car.vehicleNumber}) payouts successfully approved. Payouts marked as processed.`);
                              onRefresh?.();
                            } catch (err) {
                              console.error(err);
                              alert("Database write error: Settle payouts failed to save.");
                            } finally {
                              setIsSubmittingSettle(false);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-lg text-xs transition cursor-pointer active:scale-95 flex-1 text-center"
                        >
                          {isSubmittingSettle ? "Settling..." : "Authorize & Mark Settled"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 italic text-xs">
                  All closed vehicle deal portfolios have been settled! No pending alert pipelines exist at the moment.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
