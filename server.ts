import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import PDFDocument from "pdfkit";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large JSON and URL encoded payloads for base64 documents (e.g. RC copies, service bills)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, "db.json");
const PARTNERS_FILE = path.join(DATA_DIR, "partners.json");

interface DBPartner {
  id: string;
  name: string;
  walletBalance: number;
}

// Types
interface PartnerInvestment {
  partnerName: string;
  investedAmount: number;
  profitSharePercent: number; // e.g. 50 meaning 50%
}

interface Expense {
  id: string;
  type: "Petrol" | "Maintenance Charges" | "Broker Commission" | "Service Expenses" | "Legal & Documentation" | "Other";
  amount: number;
  date: string;
  description: string;
}

interface CarDocument {
  id: string;
  name: string; // e.g. "RC Copy", "Insurance Agreement"
  type: string; // mimeType or extension
  uploadedAt: string;
  base64Data: string; // base64 payload
}

interface Car {
  id: string;
  vehicleNumber: string; // e.g. "MH-12-QA-8822"
  makeModel: string; // e.g. "Honda City 1.5 i-VTEC"
  purchaseDate: string;
  purchaseAmount: number;
  sellerDetails: string; // "Name (phone), notes"
  status: "Purchased" | "In Service" | "Showroom Ready" | "Sold";
  
  // Sale details (optional)
  saleDate?: string;
  saleAmount?: number;
  buyerDetails?: string;
  deliveryInfo?: string;

  // Investment splits
  investments: PartnerInvestment[];

  // Operating costs
  expenses: Expense[];

  // Uploaded paper trails
  documents: CarDocument[];

  // Settlement state
  payoutsProcessed?: boolean;

  // Additional quick notes
  notes?: string;
}

// Default Seed Data
const DEFAULT_CARS: Car[] = [
  {
    id: "car-1",
    vehicleNumber: "MH-12-QA-8822",
    makeModel: "Honda City 1.5 i-VTEC (2018)",
    purchaseDate: "2026-01-10",
    purchaseAmount: 450000,
    sellerDetails: "Ramesh Kumar (+91 98765 43210) - Direct Owner",
    status: "Sold",
    saleDate: "2026-03-20",
    saleAmount: 580000,
    buyerDetails: "Sunita Deshmukh (+91 91234 56789) - IT Professional",
    deliveryInfo: "Delivered on 2026-03-21, duplicate keys handed over with RC Transfer forms 29/30.",
    investments: [
      { partnerName: "Rajesh S.", investedAmount: 225000, profitSharePercent: 50 },
      { partnerName: "Amit Patel", investedAmount: 225000, profitSharePercent: 50 }
    ],
    expenses: [
      { id: "e1-1", type: "Broker Commission", amount: 10000, date: "2026-01-11", description: "Agent Mahesh brokerage for vehicle procurement" },
      { id: "e1-2", type: "Service Expenses", amount: 12000, date: "2026-01-15", description: "Complete synthetic engine oil swap, oil filter, air filter, and wheel alignment" },
      { id: "e1-3", type: "Maintenance Charges", amount: 8000, date: "2026-01-18", description: "Dry-cleaning, body compounding + polish, and minor front bumper scratch repair" },
      { id: "e1-4", type: "Petrol", amount: 2000, date: "2026-01-20", description: "Fuel refuel for multiple potential buyer test-drives" }
    ],
    documents: [
      {
        id: "doc-1",
        name: "RC_Book_MH12QA8822.pdf",
        type: "application/pdf",
        uploadedAt: "2026-01-11T10:30:00Z",
        base64Data: "JVBERi0xLjQKJ... [Sample Original Registration Certificate]"
      }
    ]
  },
  {
    id: "car-2",
    vehicleNumber: "KA-03-MK-4545",
    makeModel: "Hyundai Creta 1.6 SX Petrol (2020)",
    purchaseDate: "2026-04-15",
    purchaseAmount: 850000,
    sellerDetails: "Varun Nair (+91 98450 12345) - Secondary Dealer Outflow",
    status: "Showroom Ready",
    investments: [
      { partnerName: "Rajesh S.", investedAmount: 510000, profitSharePercent: 60 },
      { partnerName: "Vikram Shah", investedAmount: 340000, profitSharePercent: 40 }
    ],
    expenses: [
      { id: "e2-1", type: "Maintenance Charges", amount: 15000, date: "2026-04-18", description: "Luxury ceramic coating and complete interior deep clean detailing" },
      { id: "e2-2", type: "Service Expenses", amount: 5000, date: "2026-04-20", description: "Brake padding swap and sensor diagnostic scan" },
      { id: "e2-3", type: "Broker Commission", amount: 15000, date: "2026-04-15", description: "Brokerage commission paid to Bangalore Car Finders" }
    ],
    documents: []
  },
  {
    id: "car-3",
    vehicleNumber: "DL-1C-AA-9090",
    makeModel: "Maruti Suzuki Swift VXI (2019)",
    purchaseDate: "2026-05-02",
    purchaseAmount: 320000,
    sellerDetails: "Anil Sharma (+91 98110 22334) - Re-possessor Auction",
    status: "In Service",
    investments: [
      { partnerName: "Amit Patel", investedAmount: 160000, profitSharePercent: 50 },
      { partnerName: "Vikram Shah", investedAmount: 160000, profitSharePercent: 50 }
    ],
    expenses: [
      { id: "e3-1", type: "Service Expenses", amount: 25000, date: "2026-05-05", description: "Full front suspencion overhaul, clutch plate replacement, and flywheel grind" },
      { id: "e3-2", type: "Petrol", amount: 1500, date: "2026-05-03", description: "Fuel for towing and workshop transportation" }
    ],
    documents: []
  }
];

// Load current data helper
function loadCars(): Car[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_CARS, null, 2));
      return DEFAULT_CARS;
    }
  } catch (error) {
    console.error("Error reading database file, using fallback:", error);
    return DEFAULT_CARS;
  }
}

// Save data helper
function saveCars(cars: Car[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cars, null, 2));
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Load current partners helper
function loadPartners(): DBPartner[] {
  try {
    if (fs.existsSync(PARTNERS_FILE)) {
      const content = fs.readFileSync(PARTNERS_FILE, "utf-8");
      return JSON.parse(content);
    } else {
      const defaultPartners: DBPartner[] = [
        { id: "p-1", name: "Rajesh S.", walletBalance: 1000000 },
        { id: "p-2", name: "Amit Patel", walletBalance: 750005 },
        { id: "p-3", name: "Vikram Shah", walletBalance: 500000 }
      ];
      fs.writeFileSync(PARTNERS_FILE, JSON.stringify(defaultPartners, null, 2));
      return defaultPartners;
    }
  } catch (error) {
    console.error("Error reading partners database file, using fallback:", error);
    return [];
  }
}

// Save partners helper
function savePartners(partners: DBPartner[]) {
  try {
    fs.writeFileSync(PARTNERS_FILE, JSON.stringify(partners, null, 2));
  } catch (error) {
    console.error("Error writing to partners database file:", error);
  }
}

// ----------------------------------------------------
// REST APIs
// ----------------------------------------------------

// 0. Partners and Wallet APIs
app.get("/api/partners", (req: Request, res: Response) => {
  const partners = loadPartners();
  res.json(partners);
});

app.post("/api/partners", (req: Request, res: Response) => {
  const partners = loadPartners();
  const { name, walletBalance } = req.body;
  if (!name) return res.status(400).json({ error: "Missing required field: name" });

  const existingIndex = partners.findIndex(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existingIndex !== -1) {
    return res.status(400).json({ error: "Partner already exists" });
  }

  const newPartner: DBPartner = {
    id: `p-${Date.now()}`,
    name: name.trim(),
    walletBalance: walletBalance !== undefined ? Number(walletBalance) : 0
  };
  partners.push(newPartner);
  savePartners(partners);
  res.status(201).json(newPartner);
});

app.post("/api/partners/adjust-wallet", (req: Request, res: Response) => {
  const partners = loadPartners();
  const { name, amount, type } = req.body; // type: "deposit" | "withdraw"
  if (!name || amount === undefined || !type) {
    return res.status(400).json({ error: "Missing required fields: name, amount, type" });
  }

  const partner = partners.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!partner) {
    return res.status(404).json({ error: "Partner not found" });
  }

  const change = Number(amount);
  if (type === "deposit") {
    partner.walletBalance += change;
  } else if (type === "withdraw") {
    if (partner.walletBalance < change) {
      return res.status(400).json({ error: "Insufficient wallet balance available." });
    }
    partner.walletBalance -= change;
  } else {
    return res.status(400).json({ error: "Invalid adjustment type" });
  }

  savePartners(partners);
  res.json(partner);
});

// 1. Fetch all cars
app.get("/api/cars", (req: Request, res: Response) => {
  const cars = loadCars();
  res.json(cars);
});

// 2. Fetch single car
app.get("/api/cars/:id", (req: Request, res: Response) => {
  const cars = loadCars();
  const car = cars.find((c) => c.id === req.params.id);
  if (!car) {
    return res.status(404).json({ error: "Car not found" });
  }
  res.json(car);
});

// 3. Create a car
app.post("/api/cars", (req: Request, res: Response) => {
  const cars = loadCars();
  const {
    vehicleNumber,
    makeModel,
    purchaseDate,
    purchaseAmount,
    sellerDetails,
    status,
    investments,
    saleDate,
    saleAmount,
    buyerDetails,
    deliveryInfo
  } = req.body;

  if (!vehicleNumber || !makeModel || !purchaseDate || purchaseAmount === undefined) {
    return res.status(400).json({ error: "Missing required fields: vehicleNumber, makeModel, purchaseDate, purchaseAmount" });
  }

  const newCar: Car = {
    id: `car-${Date.now()}`,
    vehicleNumber: vehicleNumber.trim().toUpperCase(),
    makeModel: makeModel.trim(),
    purchaseDate,
    purchaseAmount: Number(purchaseAmount),
    sellerDetails: sellerDetails || "",
    status: status || "Purchased",
    investments: investments || [],
    expenses: [],
    documents: [],
    payoutsProcessed: false,
    ...(status === "Sold" ? { saleDate, saleAmount: Number(saleAmount), buyerDetails, deliveryInfo } : {})
  };

  cars.push(newCar);
  saveCars(cars);

  // Deduct investment amounts from partner wallets
  if (investments && Array.isArray(investments)) {
    const partners = loadPartners();
    investments.forEach((inv: any) => {
      if (inv.partnerName) {
        const p = partners.find(p => p.name.trim().toLowerCase() === inv.partnerName.trim().toLowerCase());
        if (p) {
          p.walletBalance -= Number(inv.investedAmount || 0);
        } else {
          // Add them on the fly
          partners.push({
            id: `p-${Date.now()}-${Math.random()}`,
            name: inv.partnerName.trim(),
            walletBalance: 0 - Number(inv.investedAmount || 0)
          });
        }
      }
    });
    savePartners(partners);
  }

  res.status(201).json(newCar);
});

// 4. Update a car
app.put("/api/cars/:id", (req: Request, res: Response) => {
  const cars = loadCars();
  const index = cars.findIndex((c) => c.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: "Car not found" });
  }

  const existingCar = cars[index];
  const {
    vehicleNumber,
    makeModel,
    purchaseDate,
    purchaseAmount,
    sellerDetails,
    status,
    saleDate,
    saleAmount,
    buyerDetails,
    deliveryInfo,
    investments,
    expenses,
    payoutsProcessed,
    documents,
    notes
  } = req.body;

  const updatedCar: Car = {
    ...existingCar,
    vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : existingCar.vehicleNumber,
    makeModel: makeModel ? makeModel.trim() : existingCar.makeModel,
    purchaseDate: purchaseDate || existingCar.purchaseDate,
    purchaseAmount: purchaseAmount !== undefined ? Number(purchaseAmount) : existingCar.purchaseAmount,
    sellerDetails: sellerDetails !== undefined ? sellerDetails : existingCar.sellerDetails,
    status: status || existingCar.status,
    investments: investments || existingCar.investments,
    expenses: expenses || existingCar.expenses,
    payoutsProcessed: payoutsProcessed !== undefined ? Boolean(payoutsProcessed) : existingCar.payoutsProcessed,
    documents: documents !== undefined ? documents : existingCar.documents,
    notes: notes !== undefined ? notes : existingCar.notes
  };

  // Status transitions or status-associated properties
  if (updatedCar.status === "Sold") {
    updatedCar.saleDate = saleDate || existingCar.saleDate;
    updatedCar.saleAmount = saleAmount !== undefined ? Number(saleAmount) : existingCar.saleAmount;
    updatedCar.buyerDetails = buyerDetails !== undefined ? buyerDetails : existingCar.buyerDetails;
    updatedCar.deliveryInfo = deliveryInfo !== undefined ? deliveryInfo : existingCar.deliveryInfo;
  } else {
    // Clear sale info if status is rolled back
    delete updatedCar.saleDate;
    delete updatedCar.saleAmount;
    delete updatedCar.buyerDetails;
    delete updatedCar.deliveryInfo;
  }

  // Partner Wallet Symmetrical Calculations and Adjustments
  const partners = loadPartners();

  // 1. If investments list or amounts are modified on an active, unsettled car, adjust balances
  if (investments && Array.isArray(investments) && !existingCar.payoutsProcessed) {
    // Refund the old investment amounts to partner wallets
    existingCar.investments.forEach((oldInv) => {
      const p = partners.find(p => p.name.trim().toLowerCase() === oldInv.partnerName.trim().toLowerCase());
      if (p) {
        p.walletBalance += Number(oldInv.investedAmount || 0);
      }
    });

    // Deduct the new investment amounts from partner wallets
    investments.forEach((newInv: any) => {
      if (newInv.partnerName) {
        const p = partners.find(p => p.name.trim().toLowerCase() === newInv.partnerName.trim().toLowerCase());
        if (p) {
          p.walletBalance -= Number(newInv.investedAmount || 0);
        } else {
          // Add them on the fly
          partners.push({
            id: `p-${Date.now()}-${Math.random()}`,
            name: newInv.partnerName.trim(),
            walletBalance: 0 - Number(newInv.investedAmount || 0)
          });
        }
      }
    });
  }

  // 2. Adjust balances if payoutsProcessed transitions
  const prevProcessed = Boolean(existingCar.payoutsProcessed);
  const nextProcessed = payoutsProcessed !== undefined ? Boolean(payoutsProcessed) : prevProcessed;

  if (prevProcessed !== nextProcessed) {
    const activeExpenses = expenses || existingCar.expenses || [];
    const expensesSum = activeExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    const purchaseAmt = purchaseAmount !== undefined ? Number(purchaseAmount) : (existingCar.purchaseAmount || 0);
    const saleAmt = saleAmount !== undefined ? Number(saleAmount) : (existingCar.saleAmount || 0);
    const totalProfit = saleAmt - (purchaseAmt + expensesSum);

    const targetInvestments = investments || existingCar.investments || [];

    targetInvestments.forEach((inv: any) => {
      if (inv.partnerName) {
        const p = partners.find(p => p.name.trim().toLowerCase() === inv.partnerName.trim().toLowerCase());
        if (p) {
          const partnerProfitShare = (totalProfit * inv.profitSharePercent) / 100;
          const releaseAmount = Number(inv.investedAmount || 0) + partnerProfitShare;

          if (nextProcessed) {
            // Payout confirmed! Return investment + profit share to wallet
            p.walletBalance += releaseAmount;
          } else {
            // Payout reverted. Deduct what we credited.
            p.walletBalance -= releaseAmount;
          }
        }
      }
    });
  }

  savePartners(partners);

  cars[index] = updatedCar;
  saveCars(cars);
  res.json(updatedCar);
});

// 5. Delete a car
app.delete("/api/cars/:id", (req: Request, res: Response) => {
  let cars = loadCars();
  const index = cars.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Car not found" });
  }

  const carToDelete = cars[index];

  // Symmetrical rollback for delete: refund locked investment capital of unpaid cars to wallets
  if (!carToDelete.payoutsProcessed) {
    const partners = loadPartners();
    carToDelete.investments.forEach((inv) => {
      if (inv.partnerName) {
        const p = partners.find(p => p.name.trim().toLowerCase() === inv.partnerName.trim().toLowerCase());
        if (p) {
          p.walletBalance += Number(inv.investedAmount || 0);
        }
      }
    });
    savePartners(partners);
  }

  cars = cars.filter((c) => c.id !== req.params.id);
  saveCars(cars);
  res.json({ message: "Car deleted successfully" });
});

// 6. Upload a document for a car
app.post("/api/cars/:id/documents", (req: Request, res: Response) => {
  const cars = loadCars();
  const car = cars.find((c) => c.id === req.params.id);

  if (!car) {
    return res.status(404).json({ error: "Car not found" });
  }

  const { name, type, base64Data } = req.body;
  if (!name || !base64Data) {
    return res.status(400).json({ error: "Missing required fields: name, base64Data" });
  }

  const newDoc: CarDocument = {
    id: `doc-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    name,
    type: type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
    base64Data
  };

  car.documents.push(newDoc);
  saveCars(cars);
  res.json(car);
});

// 7. Delete a document from a car
app.delete("/api/cars/:id/documents/:docId", (req: Request, res: Response) => {
  const cars = loadCars();
  const car = cars.find((c) => c.id === req.params.id);

  if (!car) {
    return res.status(404).json({ error: "Car not found" });
  }

  const docIndex = car.documents.findIndex((d) => d.id === req.params.docId);
  if (docIndex === -1) {
    return res.status(404).json({ error: "Document not found" });
  }

  car.documents.splice(docIndex, 1);
  saveCars(cars);
  res.json(car);
});

// ----------------------------------------------------
// server-side PDF generation request for the entire portfolio ledger
// ----------------------------------------------------
app.get("/api/reports/pdf", (req: Request, res: Response) => {
  const cars = loadCars();
  
  // Setup document
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: "CarPartner Portfolio Consolidated Ledger Report",
      Author: "CarPartner Pro Operations Suite",
      Subject: "Audit-ready financial settlement ledger",
    }
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Full_Portfolio_Audit_Ledger_${new Date().toISOString().substring(0, 10)}.pdf"`
  );

  doc.pipe(res);

  const primaryColor = "#0f172a"; // slate-900 Core
  const secondaryColor = "#475569"; // slate-600 Subtitles
  const accentColor = "#4f46e5"; // indigo-600 Elements
  const lightBgColor = "#f8fafc"; // slate-50 Table headers or blocks
  const borderColor = "#cbd5e1"; // slate-300 Lines
  const successColor = "#047857"; // emerald-700 Profits
  const dangerColor = "#b91c1c"; // red-750 Losses

  // Helper function to format INR currency safely in plain Helvetica PDF font
  const formatINR = (val: number) => {
    return "INR " + Math.round(val).toLocaleString("en-IN");
  };

  // ----------------------------------------------------
  // COVER PAGE: Portfolio Executive Overview
  // ----------------------------------------------------
  
  // Main Title Banner
  doc.rect(40, 40, 515, 60).fill("#1e293b");
  doc.fillColor("#ffffff")
     .font("Helvetica-Bold")
     .fontSize(16)
     .text("USED CAR TRADING PARTNERSHIP LTD", 55, 52)
     .fontSize(10)
     .font("Helvetica")
     .text("Portfolio Consolidated Investment Ledger & Executive Audit Details", 55, 75);

  // Metadata block
  doc.fillColor(primaryColor)
     .font("Helvetica-Bold")
     .fontSize(10)
     .text("Issue Date:", 40, 120)
     .font("Helvetica")
     .text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 110, 120);

  doc.font("Helvetica-Bold")
     .text("Classification:", 330, 120)
     .font("Helvetica")
     .text("Confidential / Joint Stakeholder Ledger", 410, 120);

  doc.moveTo(40, 140).lineTo(555, 140).strokeColor(borderColor).lineWidth(1).stroke();

  // Compute aggregated stats
  let totalSourcedAmount = 0;
  let totalAmortizedExpenses = 0;
  let totalExitRevenue = 0;
  let totalNetProfit = 0;
  let activeCount = 0;
  let soldCount = 0;

  cars.forEach(car => {
    totalSourcedAmount += car.purchaseAmount;
    const expSum = car.expenses.reduce((s, e) => s + e.amount, 0);
    totalAmortizedExpenses += expSum;
    if (car.status === "Sold") {
      soldCount += 1;
      totalExitRevenue += car.saleAmount || 0;
      totalNetProfit += (car.saleAmount || 0) - (car.purchaseAmount + expSum);
    } else {
      activeCount += 1;
    }
  });

  const totalCostBasis = totalSourcedAmount + totalAmortizedExpenses;
  const overallROI = totalCostBasis > 0 ? ((totalNetProfit / totalCostBasis) * 100).toFixed(1) : "0.0";

  // Financial Metrics Grid Block in cover page
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("I. PORTFOLIO PERFORMANCE DIGEST", 40, 160);
  
  doc.rect(40, 180, 515, 95).fill(lightBgColor).stroke(borderColor).lineWidth(0.5);
  
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5).text("Total Fleet Listings:", 55, 195);
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8.5).text(`${cars.length} Cars (${soldCount} Sold / ${activeCount} Active)`, 210, 195);

  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5).text("Total Sourced Capital Outlay:", 55, 210);
  doc.fillColor(primaryColor).font("Courier-Bold").fontSize(8.5).text(formatINR(totalSourcedAmount), 210, 210);

  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5).text("Amortized Operating Expenses:", 55, 225);
  doc.fillColor(primaryColor).font("Courier-Bold").fontSize(8.5).text(formatINR(totalAmortizedExpenses), 210, 225);

  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8.5).text("Realized Exit Revenue:", 55, 240);
  doc.fillColor(primaryColor).font("Courier-Bold").fontSize(8.5).text(formatINR(totalExitRevenue), 210, 240);

  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8.5).text("Overall Realized Net Profit:", 350, 195);
  doc.fillColor(totalNetProfit >= 0 ? successColor : dangerColor).font("Courier-Bold").fontSize(10.5).text(`${totalNetProfit >= 0 ? "+" : ""}${formatINR(totalNetProfit)}`, 350, 210);

  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8.5).text("Portfolio Margin Yield:", 350, 235);
  doc.fillColor(accentColor).font("Courier-Bold").fontSize(9.5).text(`${overallROI}% Cumulative ROI`, 350, 248);

  // Partners Investment Distribution List
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(11).text("II. CO-INVESTOR BALANCES SUMMARY", 40, 295);

  // Compute partner summaries
  const pSummaries: Record<string, { invested: number; profit: number }> = {};
  cars.forEach(car => {
    const expensesSum = car.expenses.reduce((s, e) => s + e.amount, 0);
    const costBasis = car.purchaseAmount + expensesSum;
    const isSold = car.status === "Sold";
    const totalProfit = isSold ? (car.saleAmount || 0) - costBasis : 0;

    car.investments.forEach(inv => {
      const name = inv.partnerName.trim();
      if (!pSummaries[name]) {
        pSummaries[name] = { invested: 0, profit: 0 };
      }
      pSummaries[name].invested += inv.investedAmount;
      if (isSold && totalProfit > 0) {
        pSummaries[name].profit += (totalProfit * inv.profitSharePercent) / 100;
      }
    });
  });

  let partnerY = 320;
  // Draw Partner Table Header
  doc.rect(40, partnerY, 515, 18).fill("#ebeef5");
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8)
     .text("Stakeholder Name", 48, partnerY + 5)
     .text("Total Capital Outlay", 195, partnerY + 5, { width: 100, align: "right" })
     .text("Realized Net Return", 310, partnerY + 5, { width: 100, align: "right" })
     .text("Consolidated Payout", 440, partnerY + 5, { width: 100, align: "right" });

  doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, partnerY + 18).lineTo(555, partnerY + 18).stroke();
  partnerY += 18;

  const partnerNames = Object.keys(pSummaries);
  if (partnerNames.length === 0) {
    doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(8).text("No operating stakeholders statements registered.", 48, partnerY + 8);
    partnerY += 20;
  } else {
    partnerNames.forEach(pName => {
      const p = pSummaries[pName];
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(9).text(pName, 48, partnerY + 6);
      doc.font("Courier").fontSize(9)
         .text(formatINR(p.invested), 195, partnerY + 6, { width: 100, align: "right" })
         .fillColor(p.profit >= 0 ? successColor : dangerColor)
         .text(formatINR(Math.round(p.profit)), 310, partnerY + 6, { width: 100, align: "right" })
         .fillColor(accentColor).font("Courier-Bold")
         .text(formatINR(Math.round(p.invested + p.profit)), 440, partnerY + 6, { width: 100, align: "right" });
      
      doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, partnerY + 20).lineTo(555, partnerY + 20).stroke();
      partnerY += 20;
    });
  }

  // Cover Page Sign-offs
  const coverSigY = 560;
  doc.moveTo(40, coverSigY).lineTo(555, coverSigY).strokeColor(primaryColor).lineWidth(1.5).stroke();
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10).text("AUDIT VALIDATION & EXECUTION REGISTER", 40, coverSigY + 12);
  doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(8)
     .text("By appending authorization below, directors and co-investors confirm the authenticity of this consolidated trading ledger of the organization, representing audited operations up through current date.", 40, coverSigY + 25, { width: 515 });

  doc.moveTo(40, coverSigY + 100).lineTo(220, coverSigY + 100).strokeColor(borderColor).stroke();
  doc.moveTo(330, coverSigY + 100).lineTo(510, coverSigY + 100).strokeColor(borderColor).stroke();

  doc.fillColor(primaryColor).font("Helvetica")
     .fontSize(8)
     .text("Prepared By: Authorized Auditor Signature", 40, coverSigY + 105)
     .text("Co-Investor Stamp Board Verification", 330, coverSigY + 105);

  // ----------------------------------------------------
  // SUBSEQUENT PAGES: Car-by-Car Dossier Itemization
  // ----------------------------------------------------
  
  cars.forEach((car) => {
    // Each car gets its own beautifully rendered Standalone Dossier Page!
    doc.addPage();
    
    // Header bar
    doc.rect(40, 40, 515, 45).fill("#0f172a");
    doc.fillColor("#ffffff")
       .font("Helvetica-Bold")
       .fontSize(11)
       .text("PORTFOLIO ASSET LEDGER DOSSIER", 55, 50)
       .fontSize(12)
       .fillColor("#ef4444")
       .font("Courier-Bold")
       .text(car.vehicleNumber, 420, 50, { align: "right", width: 120 });

    doc.fillColor("#94a3b8")
       .font("Helvetica")
       .fontSize(8)
       .text(`Model Specs: ${car.makeModel}`, 55, 68, { width: 480, ellipsis: true, lineBreak: false });

    doc.moveTo(40, 105).lineTo(555, 105).strokeColor(borderColor).lineWidth(1.5).stroke();

    // Calculations for this individual car
    const carExpenses = car.expenses.reduce((s, e) => s + e.amount, 0);
    const carCostBasis = car.purchaseAmount + carExpenses;
    const isCarSold = car.status === "Sold";
    const carRevenue = isCarSold ? (car.saleAmount || 0) : 0;
    const carNetProfit = isCarSold ? (carRevenue - carCostBasis) : 0;
    const carROI = isCarSold && carCostBasis > 0 ? ((carNetProfit / carCostBasis) * 100).toFixed(1) : "0.0";

    // 1. Technical Parameters & Status Block
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10).text("1. VEHICLE ACQUISITION & WORKSHOP PARAMETERS", 40, 120);
    
    doc.rect(40, 135, 515, 65).fill(lightBgColor).stroke(borderColor).lineWidth(0.5);
    
    doc.fillColor(secondaryColor).font("Helvetica").fontSize(8)
       .text("Acquisition Date:", 50, 145)
       .text("Acquisition Supplier:", 50, 160)
       .text("Current Status:", 50, 175)
       .text("Sale Realized Date:", 300, 145)
       .text("Procured Stakeholders:", 300, 160)
       .text("Payout Settlement:", 300, 175);

    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8)
       .text(car.purchaseDate, 150, 145)
       .text(car.sellerDetails || "Dealer Sourced Trade", 150, 160)
       .text(car.status === "Sold" ? "SOLD (Deal Closed)" : car.status, 150, 175)
       .text(isCarSold ? (car.saleDate || "N/A") : "Inventory Active", 410, 145)
       .text(`${car.investments.length} Active Partners`, 410, 160)
       .text(car.status !== "Sold" ? "N/A" : (car.payoutsProcessed ? "Settlement Fully Paid" : "PENDING PROPORTIONAL DEPOSIT"), 410, 175);

    // 2. Financial Metrics Table
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10).text("2. COST AMORTIZATION & PERFORMANCE METRICS", 40, 220);

    let auditY = 240;
    doc.rect(40, auditY, 515, 16).fill("#f1f5f9");
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(7.5)
       .text("Accounting Line Particular", 48, auditY + 4.5)
       .text("Debit (Cost Outlay)", 210, auditY + 4.5, { width: 90, align: "right" })
       .text("Credit (Revenue)", 320, auditY + 4.5, { width: 90, align: "right" })
       .text("Net Consolidated Balance", 440, auditY + 4.5, { width: 100, align: "right" });
    
    auditY += 16;
    doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, auditY).lineTo(555, auditY).stroke();

    // Table Lines
    // Purchase Cost
    doc.fillColor(primaryColor).font("Helvetica").fontSize(8.5).text("Procurement Cost Base (Original Outlay)", 48, auditY + 5);
    doc.font("Courier").text(formatINR(car.purchaseAmount), 210, auditY + 5, { width: 90, align: "right" })
       .text("---", 320, auditY + 5, { width: 90, align: "right" })
       .text(formatINR(car.purchaseAmount), 440, auditY + 5, { width: 100, align: "right" });
    auditY += 18;
    doc.strokeColor("#f1f5f9").moveTo(40, auditY).lineTo(555, auditY).stroke();

    // Expenses Outlay
    doc.fillColor(primaryColor).font("Helvetica").text("Refurbishment, Procurement & Service Expenses", 48, auditY + 5);
    doc.font("Courier").text(formatINR(carExpenses), 210, auditY + 5, { width: 90, align: "right" })
       .text("---", 320, auditY + 5, { width: 90, align: "right" })
       .text(formatINR(carExpenses), 440, auditY + 5, { width: 100, align: "right" });
    auditY += 18;
    doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, auditY).lineTo(555, auditY).stroke();

    // Sale Value (if sold)
    if (isCarSold) {
      doc.fillColor(primaryColor).font("Helvetica").text("Exit Disposition Sales Realized Revenue", 48, auditY + 5);
      doc.font("Courier").text("---", 210, auditY + 5, { width: 90, align: "right" })
         .text(formatINR(carRevenue), 320, auditY + 5, { width: 90, align: "right" })
         .text(formatINR(carRevenue), 440, auditY + 5, { width: 100, align: "right" });
      auditY += 18;
    }

    // Consolidated Net Margin Box
    doc.rect(40, auditY, 515, 20).fill("#1e293b");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8.5).text("Consolidated Profit & Ledger Exit Balance", 48, auditY + 6);
    doc.font("Courier-Bold").fontSize(9.5)
       .text(
         isCarSold 
           ? `${carNetProfit >= 0 ? "+" : ""}${formatINR(carNetProfit)} (${carROI}% ROI Margin)`
           : `DEAL IN OPERATIONS (Current Cost Basis: ${formatINR(carCostBasis)})`,
         210, auditY + 6, { width: 330, align: "right" }
       );
    auditY += 35;

    // 3. Investments Split Table
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10).text("3. PARTNERSHIP EQUITY ALLOCATION & DIVIDENDS", 40, auditY);
    auditY += 16;

    doc.rect(40, auditY, 515, 16).fill("#ebeef5");
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(7.5)
       .text("Stakeholder Partner Name", 48, auditY + 4.5)
       .text("Invested Ratio", 200, auditY + 4.5, { width: 75, align: "right" })
       .text("Profit share %", 285, auditY + 4.5, { width: 75, align: "right" })
       .text("Net Dividend Split", 370, auditY + 4.5, { width: 85, align: "right" })
       .text("Total Settlement Return", 465, auditY + 4.5, { width: 85, align: "right" });
    
    auditY += 16;
    doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, auditY).lineTo(555, auditY).stroke();

    if (car.investments.length === 0) {
      doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(8).text("No operating partners mapped to this asset card ledger.", 48, auditY + 6);
      auditY += 18;
    } else {
      car.investments.forEach(inv => {
        const shareOfProfit = isCarSold ? (carNetProfit * inv.profitSharePercent) / 100 : 0;
        const payoutValue = isCarSold ? (inv.investedAmount + shareOfProfit) : inv.investedAmount;

        doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8.5).text(inv.partnerName, 48, auditY + 5, { width: 142, ellipsis: true, lineBreak: false });
        doc.font("Courier").fontSize(8.5)
           .text(formatINR(inv.investedAmount), 200, auditY + 5, { width: 75, align: "right" })
           .text(`${inv.profitSharePercent}%`, 285, auditY + 5, { width: 75, align: "right" })
           .fillColor(shareOfProfit >= 0 ? successColor : dangerColor)
           .text(isCarSold ? `${shareOfProfit >= 0 ? "+" : ""}${formatINR(Math.round(shareOfProfit))}` : "---", 370, auditY + 5, { width: 85, align: "right" })
           .fillColor(primaryColor).font("Courier-Bold")
           .text(formatINR(Math.round(payoutValue)), 465, auditY + 5, { width: 85, align: "right" });
        
        auditY += 18;
        doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(40, auditY).lineTo(555, auditY).stroke();
      });
    }
    auditY += 15;

    // Page boundary check before Section 4 to prevent cutoff
    if (auditY + 65 > 790) {
      doc.addPage();
      doc.rect(40, 40, 515, 20).fill("#0f172a");
      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(9)
         .text(`DOSSIER CONTINUATION: ${car.vehicleNumber}`, 55, 46);
      auditY = 75;
    }

    // 4. Overheads details log
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10).text("4. EXPENSE & REFURBISHMENT DETAILS ITEMIZATION", 40, auditY);
    auditY += 16;

    doc.rect(40, auditY, 515, 16).fill("#f8fafc");
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(7.5)
       .text("Log Date", 48, auditY + 4.5)
       .text("Category Type", 120, auditY + 4.5)
       .text("Description Context", 225, auditY + 4.5)
       .text("Amount Paid", 465, auditY + 4.5, { width: 85, align: "right" });
    
    auditY += 16;
    doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, auditY).lineTo(555, auditY).stroke();

    if (car.expenses.length === 0) {
      doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(8).text("No operating overhead expense items logged in this vehicle dossier.", 48, auditY + 6);
      auditY += 18;
    } else {
      car.expenses.slice(0, 5).forEach(exp => {
        doc.fillColor(primaryColor).font("Courier").fontSize(8).text(exp.date, 48, auditY + 4.5, { width: 68, ellipsis: true, lineBreak: false });
        doc.font("Helvetica-Bold").text(exp.type, 120, auditY + 4.5, { width: 100, ellipsis: true, lineBreak: false });
        
        // Truncate long descriptions
        const cleanDesc = exp.description.length > 55 ? exp.description.substring(0, 52) + "..." : exp.description;
        doc.font("Helvetica").text(cleanDesc, 225, auditY + 4.5, { width: 235, ellipsis: true, lineBreak: false });
        doc.font("Courier").text(formatINR(exp.amount), 465, auditY + 4.5, { width: 85, align: "right" });
        
        auditY += 15;
        doc.strokeColor("#f1f5f9").lineWidth(0.5).moveTo(40, auditY).lineTo(555, auditY).stroke();
      });
      if (car.expenses.length > 5) {
        doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(7.5).text(`* Showing first 5 expense logs. Additional ${car.expenses.length - 5} logs persisted on server archives.`, 48, auditY + 4.5);
        auditY += 14;
      }
    }
    auditY += 20;

    // Page boundary check before Section 5 to prevent footer overlap or page cutoff
    if (auditY + 85 > 790) {
      doc.addPage();
      doc.rect(40, 40, 515, 20).fill("#0f172a");
      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(9)
         .text(`DOSSIER CONTINUATION: ${car.vehicleNumber}`, 55, 46);
      auditY = 75;
    }

    // 5. Attached Legal Documents Audit Section (New)
    doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(10).text("5. LEGAL COMPLIANCE & ARCHIVE CHECKS", 40, auditY);
    auditY += 16;

    doc.rect(40, auditY, 515, 45).fill(lightBgColor).stroke(borderColor).lineWidth(0.5);

    const hasRC = car.documents.some(d => d.name.startsWith("[RC_Book]_"));
    const hasAgreement = car.documents.some(d => d.name.startsWith("[Agreement]_"));
    const rcDocName = hasRC ? car.documents.find(d => d.name.startsWith("[RC_Book]_"))?.name.replace("[RC_Book]_", "") : "NOT FOUND (Pending Upload)";
    const agreeDocName = hasAgreement ? car.documents.find(d => d.name.startsWith("[Agreement]_"))?.name.replace("[Agreement]_", "") : "NOT FOUND (Pending Upload)";
    
    // Count other attachments
    const otherDocsCount = car.documents.filter(d => !d.name.startsWith("[RC_Book]_") && !d.name.startsWith("[Agreement]_")).length;

    doc.fillColor(secondaryColor).font("Helvetica").fontSize(8)
       .text("Registration (RC Book Copy):", 50, auditY + 8)
       .text("Partnership Agreement Link:", 50, auditY + 19)
       .text("Other Verified Files Counter:", 50, auditY + 30);

    doc.fillColor(hasRC ? successColor : dangerColor).font("Helvetica-Bold").fontSize(8)
       .text(hasRC ? `[VERIFIED] - ${rcDocName}` : `[PENDING UPLOAD] - Missing smartcard copy`, 180, auditY + 8);
    
    doc.fillColor(hasAgreement ? successColor : dangerColor).font("Helvetica-Bold").fontSize(8)
       .text(hasAgreement ? `[VERIFIED] - ${agreeDocName}` : `[PENDING DEED] - Missing co-investment deed`, 180, auditY + 19);

    doc.fillColor(otherDocsCount > 0 ? successColor : secondaryColor).font("Helvetica-Bold").fontSize(8)
       .text(otherDocsCount > 0 ? `[VERIFIED] - ${otherDocsCount} items (Photos / Receipts archive)` : `[EMPTY ARCHIVE] - No supplementary files`, 180, auditY + 30);

    auditY += 55;

    // Hand signature block for this car with dynamic overlapping protection
    let docSigY = Math.max(auditY + 15, 520);
    if (docSigY + 100 > 790) {
      doc.addPage();
      // Draw a small header on the continuation page
      doc.rect(40, 40, 515, 20).fill("#0f172a");
      doc.fillColor("#ffffff")
         .font("Helvetica-Bold")
         .fontSize(9)
         .text(`AUDIT VALIDATION CONTINUATION: ${car.vehicleNumber}`, 55, 46);
      docSigY = 80;
    }

    doc.moveTo(40, docSigY).lineTo(555, docSigY).strokeColor(primaryColor).lineWidth(1.5).stroke();
    doc.fillColor(primaryColor).font("Helvetica")
       .fontSize(7.5)
       .text("I hereby certify that all refurbishment details, operating capital outlays and partner splits mentioned in this asset record match local files.", 40, docSigY + 10, { width: 515 });

    doc.moveTo(40, docSigY + 75).lineTo(200, docSigY + 75).strokeColor(borderColor).lineWidth(0.5).stroke();
    doc.moveTo(395, docSigY + 75).lineTo(555, docSigY + 75).strokeColor(borderColor).lineWidth(0.5).stroke();

    doc.fillColor(primaryColor).font("Helvetica-Bold")
       .text("Dealer Executive Audit Desk", 40, docSigY + 80)
       .text("Authorized Co-Investor Signatures", 395, docSigY + 80, { align: "right", width: 160 });
  });

  // Complete PDF stream
  doc.end();
});

// ----------------------------------------------------
// PDF generation for custom-filtered listings on VehiclesTab
// ----------------------------------------------------
app.get("/api/reports/filtered-vehicles-pdf", (req: Request, res: Response) => {
  const cars = loadCars();
  const { searchText, statusFilter, partnerFilter, dateFilter, startDateFilter, endDateFilter } = req.query;

  const filtered = cars.filter(car => {
    let matchesSearch = true;
    if (searchText && typeof searchText === "string" && searchText.trim()) {
      const searchTerms = searchText.toLowerCase().split(/\s+/).filter(Boolean);
      matchesSearch = searchTerms.length === 0 || searchTerms.every(term => {
        const vehicleNum = car.vehicleNumber.toLowerCase();
        const makeModel = car.makeModel.toLowerCase();
        const seller = (car.sellerDetails || "").toLowerCase();
        const buyer = (car.buyerDetails || "").toLowerCase();
        const delivery = (car.deliveryInfo || "").toLowerCase();
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
          hasMatchingExpense
        );
      });
    }

    let matchesStatus = true;
    if (statusFilter && typeof statusFilter === "string" && statusFilter !== "ALL") {
      matchesStatus = car.status === statusFilter;
    }

    let matchesPartner = true;
    if (partnerFilter && typeof partnerFilter === "string" && partnerFilter !== "ALL") {
      matchesPartner = car.investments.some(inv => inv.partnerName.trim() === partnerFilter);
    }

    let matchesDate = true;
    if (dateFilter && typeof dateFilter === "string" && dateFilter.trim()) {
      matchesDate = car.purchaseDate.includes(dateFilter);
    }

    let matchesRange = true;
    if (startDateFilter && typeof startDateFilter === "string" && startDateFilter.trim() && car.purchaseDate < startDateFilter.trim()) {
      matchesRange = false;
    }
    if (endDateFilter && typeof endDateFilter === "string" && endDateFilter.trim() && car.purchaseDate > endDateFilter.trim()) {
      matchesRange = false;
    }

    return matchesSearch && matchesStatus && matchesPartner && matchesDate && matchesRange;
  });

  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    info: {
      Title: "CarPartner Filtered Vehicles List Ledger",
      Author: "CarPartner Pro Operations Suite",
      Subject: "Audit-ready filtered fleet list summary",
    }
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Filtered_Vehicles_Report_${new Date().toISOString().substring(0, 10)}.pdf"`
  );

  doc.pipe(res);

  const primaryColor = "#0f172a"; 
  const secondaryColor = "#475569"; 
  const accentColor = "#4f46e5"; 
  const lightBgColor = "#f8fafc"; 
  const borderColor = "#cbd5e1"; 
  const successColor = "#047857"; 
  const dangerColor = "#b91c1c"; 

  const formatINR = (val: number) => {
    return "INR " + Math.round(val).toLocaleString("en-IN");
  };

  // Header Banner
  doc.rect(40, 40, 515, 60).fill("#1e293b");
  doc.fillColor("#ffffff")
     .font("Helvetica-Bold")
     .fontSize(15)
     .text("CARPARTNER FILTERED ASSETS LEDGER", 55, 52)
     .fontSize(8.5)
     .font("Helvetica")
     .text("Custom-filtered dealership listings and operating capital report", 55, 75);

  let textY = 120;
  doc.fillColor(primaryColor)
     .font("Helvetica-Bold")
     .fontSize(9)
     .text("Applied Filters Log:", 40, textY);
  
  let formattedRangeText = "All";
  if (startDateFilter || endDateFilter) {
    formattedRangeText = `${startDateFilter || "Start"} to ${endDateFilter || "End"}`;
  } else if (dateFilter) {
    formattedRangeText = String(dateFilter);
  }

  let filterText = "Search: " + (searchText ? `"${searchText}"` : "None") + 
                   " | Status: " + (statusFilter || "All") + 
                   " | Partner: " + (partnerFilter || "All") + 
                   " | Date range: " + formattedRangeText;

  doc.font("Helvetica")
     .fontSize(8)
     .text(filterText, 140, textY, { width: 415 });

  textY += 16;
  doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, textY).lineTo(555, textY).stroke();
  textY += 12;

  let totalCost = 0;
  let totalSales = 0;
  let totalProfit = 0;
  filtered.forEach(c => {
    const expSum = c.expenses.reduce((s, e) => s + e.amount, 0);
    totalCost += (c.purchaseAmount + expSum);
    if (c.status === "Sold") {
      totalSales += (c.saleAmount || 0);
    }
  });
  totalProfit = totalSales - totalCost;
  
  doc.rect(40, textY, 515, 45).fill(lightBgColor).stroke(borderColor).lineWidth(0.5);
  doc.fillColor(secondaryColor).font("Helvetica-Bold").fontSize(8)
     .text("Matched Vehicles count:", 52, textY + 10)
     .text("Cost Basis (Purchases & Workshop):", 52, textY + 26)
     .text("Exit Realized Revenue:", 330, textY + 10)
     .text("Consolidated Net Balance:", 330, textY + 26);

  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8.5)
     .text(`${filtered.length} Vehicles`, 215, textY + 10)
     .text(formatINR(totalCost), 215, textY + 26)
     .text(formatINR(totalSales), 450, textY + 10)
     .font("Courier-Bold")
     .fillColor(totalProfit >= 0 ? successColor : dangerColor)
     .text(formatINR(totalProfit), 450, textY + 26);

  textY += 60;

  doc.rect(40, textY, 515, 18).fill("#ebeef5");
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8)
     .text("Reg-No", 45, textY + 5, { width: 65, ellipsis: true, lineBreak: false })
     .text("Make & Model Specifications", 115, textY + 5, { width: 155, ellipsis: true, lineBreak: false })
     .text("Acquired On", 275, textY + 5, { width: 75, ellipsis: true, lineBreak: false })
     .text("Total Outlay", 355, textY + 5, { width: 90, align: "right" })
     .text("Status", 450, textY + 5, { width: 100, align: "right" });

  doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, textY + 18).lineTo(555, textY + 18).stroke();
  textY += 18;

  filtered.forEach((car) => {
    if (textY > 740) {
      doc.addPage();
      textY = 40;
      doc.rect(40, textY, 515, 18).fill("#ebeef5");
      doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(8)
         .text("Reg-No", 45, textY + 5, { width: 65, ellipsis: true, lineBreak: false })
         .text("Make & Model Specifications", 115, textY + 5, { width: 155, ellipsis: true, lineBreak: false })
         .text("Acquired On", 275, textY + 5, { width: 75, ellipsis: true, lineBreak: false })
         .text("Total Outlay", 355, textY + 5, { width: 90, align: "right" })
         .text("Status", 450, textY + 5, { width: 100, align: "right" });
      doc.strokeColor(borderColor).lineWidth(0.5).moveTo(40, textY + 18).lineTo(555, textY + 18).stroke();
      textY += 18;
    }

    const expSum = car.expenses.reduce((s, e) => s + e.amount, 0);
    const costBasis = car.purchaseAmount + expSum;

    doc.fillColor(primaryColor).font("Courier-Bold").fontSize(8)
       .text(car.vehicleNumber, 45, textY + 5, { width: 65, ellipsis: true, lineBreak: false })
       .font("Helvetica-Bold").fontSize(8.5)
       .text(car.makeModel, 115, textY + 5, { width: 155, ellipsis: true, lineBreak: false })
       .font("Helvetica").fontSize(8)
       .text(car.purchaseDate, 275, textY + 5, { width: 75, ellipsis: true, lineBreak: false })
       .font("Courier").fontSize(8.5)
       .text(formatINR(costBasis), 355, textY + 5, { width: 90, align: "right" })
       .font("Helvetica-Bold").fontSize(8)
       .fillColor(car.status === "Sold" ? successColor : car.status === "Showroom Ready" ? accentColor : "#f59e0b")
       .text(car.status, 450, textY + 5, { width: 100, align: "right" });

    textY += 18;
    doc.strokeColor("#f1f5f9").lineWidth(0.5).moveTo(40, textY).lineTo(555, textY).stroke();
  });

  if (textY > 680) {
    doc.addPage();
    textY = 40;
  }
  textY += 30;
  doc.moveTo(40, textY).lineTo(555, textY).strokeColor(primaryColor).lineWidth(1).stroke();
  doc.fillColor(secondaryColor).font("Helvetica-Oblique").fontSize(8)
     .text("Filtered dossier list generated directly from live system cache files. CarPartner Operations management verifies the accuracy of the statements herein on the date of execution.", 40, textY + 10, { width: 515 });

  doc.rect(40, textY + 45, 180, 0.5).fill(borderColor);
  doc.rect(375, textY + 45, 180, 0.5).fill(borderColor);
  doc.fillColor(primaryColor).font("Helvetica-Bold").fontSize(7.5)
     .text("Chief Compliance desk verification", 40, textY + 50)
     .text("Authorized Joint Representative Stamp", 375, textY + 50, { align: "right", width: 180 });

  doc.end();
});

// ----------------------------------------------------
// AI DEAL SMART ADVISOR (Gemini API Integration)
// ----------------------------------------------------
app.post("/api/ai/deal-advisor", async (req: Request, res: Response) => {
  const { carId } = req.body;
  if (!carId) {
    return res.status(400).json({ error: "Missing required field: carId" });
  }

  const cars = loadCars();
  const car = cars.find((c) => c.id === carId);
  if (!car) {
    return res.status(404).json({ error: "Car not found" });
  }

  // Check API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return res.status(403).json({
      error: "Gemini API key is not configured in Secrets panel.",
      isConfigError: true,
      fallbackContent: `### 🚗 **Car Deal Analysis Summary (Local Rule-Based Fallback)**

* **Vehicle**: **${car.makeModel}** (${car.vehicleNumber})
* **Purchase Base**: ₹${car.purchaseAmount.toLocaleString("en-IN")}
* **Current Status**: \`${car.status}\`

#### **Financial Health Diagnostics:**
* **Total Expenses Apportioned**: ₹${car.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString("en-IN")}
* **Combined Cost Capital**: ₹${(car.purchaseAmount + car.expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString("en-IN")}
${car.status === "Sold" && car.saleAmount ? `* **Revenue Realized**: ₹${car.saleAmount.toLocaleString("en-IN")}
* **Earnings Split**:
  ${car.investments.map(inv => {
    const profit = (car.saleAmount || 0) - car.purchaseAmount - car.expenses.reduce((s, e) => s + e.amount, 0);
    const partnerShare = profit > 0 ? (profit * inv.profitSharePercent / 100) : 0;
    return `- **${inv.partnerName}**: Initial Capital ₹${inv.investedAmount.toLocaleString("en-IN")} (${inv.profitSharePercent}% Share), profit paid: ₹${partnerShare.toLocaleString("en-IN")}`;
  }).join("\n")}
` : `* **Current Investments Risk Split**:
  ${car.investments.map(inv => `- **${inv.partnerName}**: Contributed ₹${inv.investedAmount.toLocaleString("en-IN")} (${inv.profitSharePercent}% Share)`).join("\n")}
`}

*💡 Note: Configure your Gemini API key in **Settings > Secrets** to generate a complete machine learning diagnostic regarding pricing trends, ROI optimization, potential risk, and sales negotiation tips!*`
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Compute basic mathematics first to supply to Gemini context
    const totalExpenses = car.expenses.reduce((sum, e) => sum + e.amount, 0);
    const costBasis = car.purchaseAmount + totalExpenses;
    const isSold = car.status === "Sold";
    const revenue = isSold ? (car.saleAmount || 0) : 0;
    const netProfit = isSold ? (revenue - costBasis) : 0;
    const marginPercent = isSold ? ((netProfit / costBasis) * 100).toFixed(1) : "0";

    const schemaContextPrompt = `You are a professional machine-learning Used Car Trading Portfolio Advisor and Investment Analyst.
Analyze the following used car business deal.

Car Details:
- Vehicle ID: ${car.id}
- Make / Model: ${car.makeModel}
- Register Plate: ${car.vehicleNumber}
- Current Status: ${car.status}
- Purchase Date: ${car.purchaseDate}
- Purchase Cost: INR ${car.purchaseAmount.toLocaleString("en-IN")}
- Seller Details: ${car.sellerDetails}

Expenses Apportioned:
${car.expenses.map(e => `- [${e.date}] ${e.type} (INR ${e.amount.toLocaleString("en-IN")}): ${e.description}`).join("\n") || "No expenses recorded yet."}
- Total Expenses APPORTIONED: INR ${totalExpenses.toLocaleString("en-IN")}
- Total Combined Capital Cost Basis: INR ${costBasis.toLocaleString("en-IN")}

Partner Investments:
${car.investments.map(inv => `- ${inv.partnerName}: Contributed INR ${inv.investedAmount.toLocaleString("en-IN")} for a ${inv.profitSharePercent}% Profit and Risk Share`).join("\n") || "No active partners invested yet."}

${isSold ? `Sale Outcome:
- Sold Date: ${car.saleDate}
- Realized Sold Amount: INR ${revenue.toLocaleString("en-IN")}
- Net Consolidated Profit: INR ${netProfit.toLocaleString("en-IN")} (${marginPercent}% margin)
- Buyer Persona: ${car.buyerDetails}
- Delivery Notes: ${car.deliveryInfo}` : `Expected Performance Targets:
- Suggested Sold range: INR ${(costBasis * 1.15).toFixed(0)} to INR ${(costBasis * 1.3).toFixed(0)} to achieve high yield margins (15%-30% ROI).`}

Please output a comprehensive markdown business brief summarizing:
1. **Deal Viability Rating**: Provide an evaluation (e.g., Highly Lucrative, Standard, Marginally Tight, High Risk).
2. **Financial Breakdown & Profit Shares**: Verify the mathematics and break down how much capital each partner receives, plus their net profit payouts (₹ amount per partner based on percentage share). 
3. **Expense Optimization Diagnostics**: Comment on whether dry-cleaning, mechanical overhauls, or commissions were reasonable, high, or if there is room for cost savings.
4. **Negotiation & Pricing Intelligence**: If unsold, give 3 actionable sales arguments / marketing keywords for this model to command high premium pricing. If sold, evaluate if the exit price is outstanding compared to general market margins.
5. **Aesthetic Summary Line**: A single witty conclusion summarizing the overall operation to reassure partners.

Keep it highly professional, clean, concise, suited for formal dealership review. Use Indian Currency Formatting (₹ and Lakhs if appropriate). Avoid self-praise or generic fluff. Go straight to markdown bullets, tables and analytical insights.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: schemaContextPrompt,
    });

    const reportMarkdown = response.text || "AI generated report came back empty";
    res.json({ report: reportMarkdown });

  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    res.status(500).json({ error: "Gemini API error occurred: " + error.message });
  }
});

// ----------------------------------------------------
// Front-end Server Serving and Dev Middlewares
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite development server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Use Vite middleware to handle front-end routes/assets
    app.use(vite.middlewares);
    console.log("Integrator: Mounted Vite development middleware");
  } else {
    // Serve production built assets from index.html
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Integrator: Serving static files from " + distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Car Partner Management Server booting up on http://localhost:${PORT}`);
  });
}

startServer();
