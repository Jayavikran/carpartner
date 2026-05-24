import React from "react";
import { Car, formatDate } from "../types";
import { X, Printer, FileSpreadsheet } from "lucide-react";

interface StatementPrintViewProps {
  car?: Car | null;
  cars?: Car[] | null;
  onClose: () => void;
}

const cleanDocName = (name: string) => {
  return name
    .replace(/^\[RC_Book\]_/, "")
    .replace(/^\[Agreement\]_/, "")
    .replace(/^\[Car_Image\]_/, "")
    .replace(/^\[Other_Legal_Paper\]_/, "")
    .replace(/^\d+__?/, "");
};

export default function StatementPrintView({ car, cars, onClose }: StatementPrintViewProps) {
  const carList = cars && cars.length > 0 ? cars : car ? [car] : [];

  const handlePrint = () => {
    window.print();
  };

  // Convert to Excel-style CSV download supporting single/multiple cars
  const triggerCsvExport = () => {
    const headers = ["Vehicle Plate", "Model", "Record Type", "Partner/Category", "Share/Date", "Details", "Amount (INR)"];
    const rows = [
      ["Consolidated Settlement Statements Dossier", "", "", "", "", "Issued:", new Date().toLocaleDateString()],
      ["", "", "", "", "", "", ""],
      headers
    ];

    carList.forEach(carItem => {
      const totalExp = carItem.expenses.reduce((sum, e) => sum + e.amount, 0);
      const isCarS = carItem.status === "Sold";
      const netP = isCarS ? ((carItem.saleAmount || 0) - (carItem.purchaseAmount + totalExp)) : 0;
      
      rows.push([carItem.vehicleNumber, carItem.makeModel, "Acquisition", carItem.sellerDetails || "Dealer Trade", carItem.purchaseDate, "Base Procurement Outlay", carItem.purchaseAmount.toString()]);
      rows.push([carItem.vehicleNumber, carItem.makeModel, "Expenses Total", "Workshop/Refurbishment", "---", "Amortized Upgrades", totalExp.toString()]);
      
      if (isCarS) {
        rows.push([carItem.vehicleNumber, carItem.makeModel, "Exit Realized", carItem.buyerDetails || "Individual Buyer", carItem.saleDate || "", "Sales Disposition", (carItem.saleAmount || 0).toString()]);
        rows.push([carItem.vehicleNumber, carItem.makeModel, "Performance Return", "Net Profit", "---", `ROI ${isCarS && (carItem.purchaseAmount + totalExp) > 0 ? (((carItem.saleAmount || 0) - (carItem.purchaseAmount + totalExp)) / (carItem.purchaseAmount + totalExp) * 100).toFixed(1) : "0"}%`, netP.toString()]);
      } else {
        rows.push([carItem.vehicleNumber, carItem.makeModel, "Exit Realized", "Deal Active", "---", `Current Cost Basis: ${(carItem.purchaseAmount + totalExp)}`, "0"]);
      }

      carItem.investments.forEach(i => {
        rows.push([carItem.vehicleNumber, carItem.makeModel, "Equity Allocation", i.partnerName, `${i.profitSharePercent}%`, "Apportioned Ratio Capital", i.investedAmount.toString()]);
      });

      carItem.expenses.forEach(e => {
        rows.push([carItem.vehicleNumber, carItem.makeModel, "Overhead Detail", e.type, e.date, e.description, e.amount.toString()]);
      });
      
      rows.push(["", "", "", "", "", "", ""]); // empty divider
    });

    // Standard CSV safety encoding with CSV cell wrapping
    const csvContent = rows
      .map(row => row.map(val => `"${(val || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = carList.length === 1 ? `Statement_${carList[0].vehicleNumber}.csv` : `Consolidated_Statements_${new Date().toISOString().substring(0, 10)}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (carList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-scrollbar fixed-overlay-print-fix">
      <style>{`
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .fixed-overlay-print-fix {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            height: auto !important;
            width: 100% !important;
          }
          .modal-card-print-fix {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
          }
          .font-print-normal {
            overflow: visible !important;
            overflow-y: visible !important;
            height: auto !important;
            display: block !important;
            padding: 0 !important;
          }
          #print-sheet {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 1.5cm !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5rem !important;
          }
          .print-block {
            display: flex !important;
            flex-direction: column !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 1.5rem !important;
            width: 100% !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            page-break-inside: auto !important;
            break-inside: auto !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          td, th {
            word-wrap: break-word !important;
            white-space: normal !important;
          }
          thead {
            display: table-header-group;
          }
          .zebra-table tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
          }
          .zebra-table tbody tr:nth-child(odd) {
            background-color: #ffffff !important;
          }
        }
      `}</style>
      {/* Container - white on screen, simple for print */}
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden select-none flex flex-col h-[90vh] modal-card-print-fix">
        
        {/* Controls - Hide on actual print page */}
        <div className="no-print px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Statement Printable Preview</h3>
            <p className="text-xs text-slate-500">Official paper sheet configured accurately for standard A4 document templates.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={triggerCsvExport}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95 text-xs text-slate-700"
              title="Download structured ledger data in CSV format"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Download as CSV</span>
            </button>

            {/* Dedicated Quick Print Icon & Text button that calls handlePrint directly */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50/50 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
              title="Trigger browser window.print() dialog with customized styles"
            >
              <Printer className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>Quick Print</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition active:scale-95"
              title="Save Statement page as PDF on your local system"
            >
              <span>Save as PDF (A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* The Print Sheet - Designed according to strict professional dealership accounting briefs */}
        <div className="flex-1 overflow-y-auto p-8 bg-white no-scrollbar font-print-normal" id="print-sheet">
          {carList.map((carItem, cIndex) => {
            const totalExpenses = carItem.expenses.reduce((sum, e) => sum + e.amount, 0);
            const costBasis = carItem.purchaseAmount + totalExpenses;
            const isSold = carItem.status === "Sold";
            const revenue = isSold ? (carItem.saleAmount || 0) : 0;
            const netProfit = isSold ? (revenue - costBasis) : 0;
            const roi = isSold && costBasis > 0 ? ((netProfit / costBasis) * 100).toFixed(1) : "0";

            return (
              <div 
                key={carItem.id} 
                className={`space-y-6 max-w-[21cm] mx-auto text-slate-900 font-sans leading-relaxed print-page`}
                style={{ 
                  pageBreakAfter: cIndex < carList.length - 1 ? "always" : "avoid",
                  breakAfter: cIndex < carList.length - 1 ? "page" : "avoid",
                  borderBottom: cIndex < carList.length - 1 ? "1px dashed #cbd5e1" : "none",
                  paddingBottom: cIndex < carList.length - 1 ? "3rem" : "0",
                  marginBottom: cIndex < carList.length - 1 ? "3rem" : "0"
                }}
              >
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-900">
                      Used Car Trading Partnership Ltd
                    </h1>
                    <p className="text-xs text-slate-500">Consolidated Settlement Ledger & Profit Disclosure Statement</p>
                    <p className="text-[10px] text-slate-400 mt-1">Audit Reference: #CP-LEDGER-{carItem.id.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Issue Date</span>
                    <span className="text-xs font-mono text-slate-800 font-bold block">{new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-extrabold uppercase">
                      {carItem.status} Status
                    </span>
                  </div>
                </div>

                {/* Vehicle Profile Details Table */}
                <div className="print-block space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
                    1. Vehicle Parameters
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Make & Model Specs</span>
                      <strong className="text-slate-800 text-[11px] uppercase block mt-0.5">{carItem.makeModel}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Plate / Reg Number</span>
                      <strong className="text-slate-800 text-[11px] font-mono block mt-0.5">{carItem.vehicleNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Acquisition Date</span>
                      <strong className="text-slate-800 text-[11px] font-mono block mt-0.5">{formatDate(carItem.purchaseDate)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Acquisition Supplier</span>
                      <strong className="text-slate-800 text-[11px] truncate block mt-0.5">{carItem.sellerDetails || "Dealer Trade"}</strong>
                    </div>
                  </div>
                </div>

                {/* Deal Financial Synthesis */}
                <div className="print-block space-y-2 pt-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                    2. Financial Audit Sheet
                  </h4>
                  
                  <table className="w-full text-xs text-left border-collapse table-fixed border border-slate-200 zebra-table">
                    <thead>
                      <tr className="border-b-2 border-slate-400 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[9px]">
                        <th className="py-2.5 px-3 w-1/2">Line Particulars</th>
                        <th className="py-2.5 px-2 text-right w-1/6">Debit (Opaque Exp)</th>
                        <th className="py-2.5 px-2 text-right w-1/6">Credit (Revenue)</th>
                        <th className="py-2.5 px-3 text-right w-1/6">Net Value (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr className="even:bg-slate-50/75 hover:bg-slate-100/50 transition duration-100">
                        <td className="py-2.5 px-3 font-semibold text-slate-700 truncate">Vehicle Original Buying Capital</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-500">₹{carItem.purchaseAmount.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">---</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-bold">₹{carItem.purchaseAmount.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr className="even:bg-slate-50/75 hover:bg-slate-100/50 transition duration-100">
                        <td className="py-2.5 px-3 font-semibold text-slate-700 truncate">Amortized Refurbishment and Maintenance Expense Outlay</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-500">₹{totalExpenses.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">---</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 font-bold">₹{totalExpenses.toLocaleString("en-IN")}</td>
                      </tr>
                      {isSold && (
                        <tr className="even:bg-slate-50/75 hover:bg-slate-100/50 transition duration-100">
                          <td className="py-2.5 px-3 font-semibold text-slate-700 truncate">Exit Realized Sales Income</td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-400">---</td>
                          <td className="py-2.5 px-2 text-right font-mono text-emerald-600">₹{carItem.saleAmount?.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">₹{carItem.saleAmount?.toLocaleString("en-IN")}</td>
                        </tr>
                      )}
                      <tr className="font-extrabold bg-slate-100 border-t border-slate-300">
                        <td className="py-3 px-3 block truncate">Consolidated Profit & Settlement Balance</td>
                        <td className="py-3 text-right font-mono text-slate-400">---</td>
                        <td className="py-3 text-right font-mono text-slate-400">---</td>
                        <td className={`py-3 px-3 text-right font-mono text-[13px] ${netProfit >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                          {isSold 
                            ? `${netProfit >= 0 ? "+" : "-"}₹${Math.abs(netProfit).toLocaleString("en-IN")} (${roi}% Yield)`
                            : `Deal Is Active (Cost Base: ₹${costBasis.toLocaleString("en-IN")})`
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Individual Partner Equity splits */}
                <div className="print-block space-y-2 pt-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                    3. Partnership Equity Allocation & Dividends
                  </h4>
                  
                  {carItem.investments.length === 0 ? (
                    <p className="text-[11px] italic text-slate-400">No partner investment structures linked to this deal sheet.</p>
                  ) : (
                    <table className="w-full text-xs text-left border-collapse table-fixed border border-slate-200 zebra-table">
                      <thead>
                        <tr className="border-b-2 border-slate-400 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[9px]">
                          <th className="py-2.5 px-3 w-[28%]">Investing Partner</th>
                          <th className="py-2.5 px-2 text-right w-[18%]">Contributed Outlay</th>
                          <th className="py-2.5 px-2 text-right w-[14%]">Profit Share (%)</th>
                          <th className="py-2.5 px-2 text-right w-[20%]">Net Dividend (₹)</th>
                          <th className="py-2.5 px-3 text-right w-[20%]">Total Settlement (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {carItem.investments.map((inv, idx) => {
                          const shareOfProfit = isSold ? (netProfit * inv.profitSharePercent) / 100 : 0;
                          const returnVal = isSold ? (inv.investedAmount + shareOfProfit) : inv.investedAmount;
                          return (
                            <tr key={idx} className="even:bg-slate-50/75 hover:bg-slate-100/50 transition duration-100">
                              <td className="py-2.5 px-3 font-bold text-slate-755 truncate">{inv.partnerName}</td>
                              <td className="py-2.5 px-2 text-right font-mono">₹{inv.investedAmount.toLocaleString("en-IN")}</td>
                              <td className="py-2.5 px-2 text-right font-mono font-medium">{inv.profitSharePercent}%</td>
                              <td className={`py-2.5 px-2 text-right font-mono font-bold ${shareOfProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                {isSold ? `${shareOfProfit >= 0 ? "+" : "-"}₹${Math.abs(shareOfProfit).toLocaleString("en-IN")}` : "---"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{returnVal.toLocaleString("en-IN")}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Operations Expenses break down */}
                {carItem.expenses.length > 0 && (
                  <div className="print-block space-y-2 pt-2">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                      4. Refurbishment & Overhead Itemization
                    </h4>
                    <table className="w-full text-[10px] text-left border-collapse table-fixed border border-slate-200 zebra-table">
                      <thead>
                        <tr className="border-b-2 border-slate-400 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[9px]">
                          <th className="py-2.5 px-3 w-[15%]">Date</th>
                          <th className="py-2.5 px-2 w-[25%]">Expense category</th>
                          <th className="py-2.5 px-2 w-[45%]">Details / Description</th>
                          <th className="py-2.5 px-3 text-right w-[15%]">Total Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {carItem.expenses.map((exp) => (
                          <tr key={exp.id} className="even:bg-slate-50/75 hover:bg-slate-100/50 transition duration-100">
                            <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{formatDate(exp.date)}</td>
                            <td className="py-2 px-2 font-bold uppercase text-slate-650 truncate">{exp.type}</td>
                            <td className="py-2 px-2 text-slate-700 truncate" title={exp.description}>{exp.description || "Refurbishment item"}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-850">₹{exp.amount.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Visual Document Showcase Inline for Dossier Printing */}
                {(() => {
                  const inlineDocs = carItem.documents.filter(d => d.base64Data && d.base64Data.startsWith("data:image/"));
                  if (inlineDocs.length === 0) return null;
                  return (
                    <div className="print-block space-y-3 pt-6 break-inside-avoid page-break-inside-avoid shadow-xs bg-slate-50/40 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                        5. Embedded Legal Proofs & Verification Photos
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {inlineDocs.map((doc) => (
                          <div key={doc.id} className="border border-slate-200 rounded-lg p-2.5 bg-white flex flex-col items-center justify-between text-center space-y-2 break-inside-avoid page-break-inside-avoid">
                            <img src={doc.base64Data} referrerPolicy="no-referrer" alt={doc.name} className="max-h-[140px] max-w-full object-contain rounded border border-slate-100" />
                            <div className="text-[10px] w-full min-w-0">
                              <span className="text-slate-850 block truncate w-full uppercase font-bold font-sans tracking-tight">{cleanDocName(doc.name)}</span>
                              <span className="text-slate-400 font-mono text-[8px] block mt-0.5">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Signatures & Execution Section - High quality binding lines */}
                <div className="print-block pt-10 space-y-6 break-inside-avoid page-break-inside-avoid">
                  <p className="text-[10px] text-slate-400 italic leading-relaxed">
                    By executing signatures below, all active stakeholders, directors, and investors acknowledge the financial metrics, margins, cost base audits, and payouts stated herein, and confirm full resolution of the partnership contract in connection with vehicle plate number {carItem.vehicleNumber}.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-6 text-[10px]">
                    <div className="space-y-12">
                      <div className="border-t border-slate-400 w-full pt-1.5 text-slate-600">
                        Prepared By: Dealers Desk Signature
                        <span className="block text-[8px] text-slate-400">Authorized Dealership representative</span>
                      </div>
                      <div className="border-t border-slate-400 w-full pt-1.5 text-slate-600">
                        Stakeholder 1 Execution Signee
                        <span className="block text-[8px] text-slate-400">Stakeholder Name / Initial Partner</span>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="border-t border-slate-400 w-full pt-1.5 text-slate-600">
                        Date & Stamp Registry
                        <span className="block text-[8px] text-slate-400">Official execution stamp validation</span>
                      </div>
                      <div className="border-t border-slate-400 w-full pt-1.5 text-slate-600">
                        Stakeholder 2 Execution Signee
                        <span className="block text-[8px] text-slate-400">Co-Investor Name / Partner verification</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
