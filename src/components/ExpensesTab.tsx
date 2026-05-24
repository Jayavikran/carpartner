import React, { useState, useMemo } from "react";
import { Car, Expense, ExpenseType } from "../types";
import { Fuel, Wrench, Handshake, Cog, Scale, HelpCircle } from "lucide-react";

export const expenseCategoryConfig: Record<
  ExpenseType,
  { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; borderColor: string; barColor: string }
> = {
  Petrol: {
    icon: Fuel,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
    barColor: "bg-amber-500",
  },
  "Maintenance Charges": {
    icon: Wrench,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-100",
    barColor: "bg-blue-500",
  },
  "Broker Commission": {
    icon: Handshake,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-100",
    barColor: "bg-purple-500",
  },
  "Service Expenses": {
    icon: Cog,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-100",
    barColor: "bg-rose-505",
  },
  "Legal & Documentation": {
    icon: Scale,
    color: "text-teal-600",
    bgColor: "bg-teal-50/80",
    borderColor: "border-teal-150",
    barColor: "bg-teal-500",
  },
  Other: {
    icon: HelpCircle,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-100",
    barColor: "bg-slate-500",
  },
};

interface ExpensesTabProps {
  cars: Car[];
  fmtCurrency: (n: number) => string;
}

export default function ExpensesTab({ cars, fmtCurrency }: ExpensesTabProps) {
  const [selectedCarId, setSelectedCarId] = useState<string | null>(() => {
    return cars[0]?.id || null;
  });

  const selectedCar = useMemo(() => {
    return cars.find(c => c.id === selectedCarId) || cars[0] || null;
  }, [cars, selectedCarId]);

  const totalExpenses = useMemo(() => {
    if (!selectedCar) return 0;
    return selectedCar.expenses.reduce((s, e) => s + e.amount, 0);
  }, [selectedCar]);

  // Status visual styles config
  const statusColors: Record<string, string> = {
    Purchased: "text-slate-500 bg-slate-50 border-slate-200",
    "In Service": "text-amber-650 bg-amber-50 border-amber-100",
    "Showroom Ready": "text-indigo-600 bg-indigo-50 border-indigo-100",
    Sold: "text-emerald-700 bg-emerald-50 border-emerald-150"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 select-none">
      {/* Left Sidebar List of Vehicles */}
      <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white border border-custom-border rounded-xl p-4 flex flex-col gap-2.5 md:h-[calc(100vh-210px)]">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block px-2">Select Vehicle Dossier</span>
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto pb-2 md:pb-0 no-scrollbar snap-x">
          {cars.map(c => {
            const expSum = c.expenses.reduce((s, e) => s + e.amount, 0);
            const isFocus = c.id === selectedCarId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCarId(c.id)}
                className={`text-left px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition shrink-0 w-44 md:w-full snap-start ${
                  isFocus 
                    ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                    : "bg-white border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div className={`font-bold uppercase truncate ${isFocus ? "text-indigo-700" : "text-slate-800"}`}>
                  {c.makeModel.split(" ").slice(0, 3).join(" ")}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                  <span className="truncate max-w-[80px]">{c.vehicleNumber}</span>
                  <span className={isFocus ? "text-indigo-700 font-bold" : "text-slate-700"}>
                    {fmtCurrency(expSum)}
                  </span>
                </div>
              </button>
            );
          })}
          {cars.length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-6 w-full">No vehicle data available</p>
          )}
        </div>
      </div>

      {/* Right Details Panel */}
      <div className="md:col-span-8 lg:col-span-9 space-y-6">
        {selectedCar ? (
          <>
            {/* Header section */}
            <div className="bg-white border border-custom-border rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-750 uppercase tracking-wide">
                      {selectedCar.vehicleNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusColors[selectedCar.status] || "bg-slate-50 text-slate-700"}`}>
                      {selectedCar.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-ink text-base uppercase leading-tight mt-1.5">{selectedCar.makeModel}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total operating expenses</span>
                  <span className="text-2xl font-black text-indigo-700 block font-mono">{fmtCurrency(totalExpenses)}</span>
                </div>
              </div>

              {/* Expense progress bars */}
              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-3">Itemized Progressive Logs</h4>
                {selectedCar.expenses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">No operative refurbishment expenses mapped on this vehicle dossier.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedCar.expenses.map((exp, idx) => {
                      const pct = totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0;
                      const cfg = expenseCategoryConfig[exp.type as ExpenseType] || expenseCategoryConfig["Other"];
                      const IconComp = cfg.icon;
                      return (
                        <div key={exp.id || idx} className="p-3 bg-white border border-slate-100 rounded-xl hover:shadow-xs transition duration-150 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-slate-400 font-mono text-[10px] font-bold">#{idx + 1}</span>
                              <div className={`p-2 rounded-lg border flex items-center justify-center shrink-0 ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
                                <IconComp className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 text-xs block">{exp.type}</span>
                                <span className="text-[11px] text-slate-500 font-normal truncate block">{exp.description || "No description provided"}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-slate-800 font-mono text-xs block">{fmtCurrency(exp.amount)}</span>
                              <span className="text-[9px] font-semibold text-slate-400 block">{pct.toFixed(0)}% of total</span>
                            </div>
                          </div>
                          {/* Visual progress bar bar */}
                          <div className="h-1.5 bg-slate-100/70 rounded-full overflow-hidden w-full">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${cfg.barColor === "bg-rose-505" ? "bg-rose-500" : cfg.barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary grid */}
            <div className="bg-white border border-custom-border rounded-xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Financial Summary Matrix</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Purchase Cost */}
                <div className="bg-bg rounded-xl p-3 border border-custom-border font-sans">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Sourced Capital (Base)</span>
                  <span className="text-base font-black text-slate-850 block mt-1 font-mono">{fmtCurrency(selectedCar.purchaseAmount)}</span>
                </div>

                {/* Refurbishing Expenses */}
                <div className="bg-bg rounded-xl p-3 border border-custom-border font-sans">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Refurbishing Costs</span>
                  <span className="text-base font-black text-indigo-700 block mt-1 font-mono">{fmtCurrency(totalExpenses)}</span>
                </div>

                {/* Sold Amount */}
                <div className="bg-bg rounded-xl p-3 border border-custom-border font-sans">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">
                    {selectedCar.status === "Sold" ? "Exit sold value" : "Pending sale price"}
                  </span>
                  <span className="text-base font-black text-emerald-600 block mt-1 font-mono">
                    {selectedCar.saleAmount ? fmtCurrency(selectedCar.saleAmount) : "Pending Exit"}
                  </span>
                </div>

                {/* Gross Profit */}
                <div className="bg-bg rounded-xl p-3 border border-custom-border font-sans">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Gross operational Margin</span>
                  <span className="text-base font-black text-slate-850 block mt-1 font-mono">
                    {selectedCar.status === "Sold" && selectedCar.saleAmount 
                      ? fmtCurrency(selectedCar.saleAmount - selectedCar.purchaseAmount) 
                      : "--"}
                  </span>
                </div>

                {/* Net Profit */}
                <div className="bg-bg rounded-xl p-3 border border-custom-border font-sans">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Net Realized Profit</span>
                  <span className="text-base font-black text-emerald-600 block mt-1 font-mono">
                    {selectedCar.status === "Sold" && selectedCar.saleAmount 
                      ? fmtCurrency(selectedCar.saleAmount - (selectedCar.purchaseAmount + totalExpenses)) 
                      : "--"}
                  </span>
                </div>

                {/* System state status */}
                <div className="bg-bg rounded-xl p-3 border border-custom-border font-sans">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Trade Dossier Status</span>
                  <span className="text-sm font-black text-slate-750 block mt-1.5 uppercase font-sans">
                    {selectedCar.status} State
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-custom-border rounded-xl p-8 shadow-sm flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-slate-400 italic">No focus vehicle dossier found. Create a car trading loop first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
