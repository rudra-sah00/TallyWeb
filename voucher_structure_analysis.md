# Complete Voucher Structure Analysis

## Voucher Data from July 2025

### Main Voucher Info:
- **GUID**: `12f989f2-4d90-4a6d-9996-a7b9961ab7bf-00008a91`
- **VOUCHERNUMBER**: `SS/0119/25-26`
- **DATE**: `20250720` (July 20, 2025)
- **VCHTYPE**: `Tax Invoice`
- **PARTYLEDGERNAME**: `Loknath Marble & Sanitary (Pandua)`

### Customer Details:
- **Party GST**: `21AIGPB1689L1ZB`
- **Address**: 
  - Pandua Chhak,PO-Kotagara
  - Via-Anlabereni,Dist-Dhenkanal

### Stock Items Structure (ALLINVENTORYENTRIES.LIST):
Each item has:
- **STOCKITEMNAME**: `20x6mtr UPvc Pipe Sch-80,Asvd.`
- **RATE**: `714.00/Pcs`
- **ACTUALQTY**: `20.00 Pcs = 120.000 Mtr`
- **BILLEDQTY**: `20.00 Pcs = 120.000 Mtr`
- **AMOUNT**: `7159.99`
- **DISCOUNT**: `49.86`
- **GSTHSNNAME**: `39172390` (HSN Code)

### Tax Details (LEDGERENTRIES.LIST):
- Customer Ledger: `-50000.00`
- Output CGST @9%: `3813.54`
- Output SGST @9%: `3813.54`
- Rounding Off: `0.28`

### Total Calculation:
- Taxable Amount: `42373.64` (50000 - 7626.36 GST)
- CGST: `3813.54`
- SGST: `3813.54`
- Total Tax: `7627.08`
- Final Amount: `50000.28`

## Issues with Current Implementation:

1. **GUID Format**: The actual GUID includes a suffix `-00008a91` but our code might be looking for exact matches
2. **Amount Parsing**: Sales amounts are negative in Tally but should be positive in display
3. **Stock Items**: Need to parse `ALLINVENTORYENTRIES.LIST` instead of just `STOCKITEM`
4. **Quantity Format**: Actual quantity is in format "20.00 Pcs = 120.000 Mtr"
5. **Tax Calculation**: Need to extract from `LEDGERENTRIES.LIST` properly

## Required Code Changes:

1. Update `getVoucherDetailsFromCache` to handle the correct XML structure
2. Fix GUID matching to be more flexible
3. Parse `ALLINVENTORYENTRIES.LIST` for stock items
4. Extract tax details from `LEDGERENTRIES.LIST`
5. Handle amount calculations properly
