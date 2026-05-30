# Tally Field ID Catalog

Extracted from live company data (Manager.1800 + TranMgr.1800).

## Universal Fields (appear across all object types)

| Field ID | Name | Example |
|----------|------|---------|
| 0x0002 | Name | "Capital Account", "Sales" |
| 0x0003 | Address / Parent ref | "Sundry Debtors" |
| 0x0067 | EnteredBy (username) | "satyananda" |
| 0x0068 | AlteredBy | "satyananda" |
| 0x0069 | LastAlteredBy | "satyananda" |
| 0x01F7 | Alias / Short name | "INR", "Purc" |
| 0x01F8 | Address line 2 | "68/A, Zone-D, Sector-A" |
| 0x01F9 | Parent group name | "Sundry Debtors", "Sales Accounts" |
| 0x01FB | GUID | "12f989f2-4d90-4a6d-..." |

## Ledger Fields (pidx=2)

| Field ID | Name | Example |
|----------|------|---------|
| 0x0963 | IsBillwise | "No" |
| 0x0A31 | Country | "India" |
| 0x0A90 | Email | "info@company.com" |
| 0x0A91 | Phone | "06762224042" |
| 0x0A93 | Contact person | "Manoj Ku Sahoo" |
| 0x0A94 | Mobile | "9437333038" |
| 0x0A97 | Country code | "+91" |
| 0x0AC1 | PAN | "AACCT3705E" |
| 0x0AC5 | VAT classification | "On VAT Rate" |
| 0x0BBB | Godown | "Default" |
| 0x0BBF | Valuation method | "Based on Value" |
| 0x0FA2 | Stock category | "Default" |
| 0x0FAB | Place of supply | "Kamakhyanagar" |
| 0x0FAC | Bank account ref | "BOB ODA-43990400000015" |
| 0x0FD4 | Default unit | "Pcs" |
| 0x200A | Country (statutory) | "India" |
| 0x200B | Country (additional) | "India" |

## Company Fields (pidx=0)

| Field ID | Name | Example |
|----------|------|---------|
| 0x0004 | State | "Odisha" |
| 0x0005 | Pincode | "751006" |
| 0x0006 | Address | "Jharpada Cuttack Road" |
| 0x0007 | Bank transfer type | "Inter Bank Transfer" |
| 0x0008 | Cost category | "Primary" |
| 0x000E-0x0022 | Voucher number prefixes | "C11/", "C14/6" |
| 0x0A2B | Credit period | "30 Days" |
| 0x0A2C | Bank account number | "30634330435" |
| 0x0A2E | Bank name | "SBI,MUNDIDEULI A.D.B" |
| 0x0A2F | Bank branch code | "5759" |
| 0x0A35 | Company email | "cuttack@marigoldpaints.com" |
| 0x0A37 | Company GSTIN | "36AABCV3609C1ZO" |
| 0x0A8F | Company pincode | "751006" |
| 0x0A96 | Website | "www.bobibanking.com" |
| 0x0AC2 | Registration number | "21741300022" |
| 0x0AC3 | License number | "DLC/D-155 DT.24-09-79" |
| 0x0ACA | GSTIN | "21AVQPS9121F1ZG" |
| 0x0ACC | GST state | "Odisha" |
| 0x0ACE | Dealer type | "Registered Dealer" |
| 0x0C83 | State (additional) | "Odisha" |
| 0x0D4C | IFSC code | "SBIN0005759" |
| 0x0D4E | Bank country | "India" |
| 0x0D50 | Previous company name | "M/S. SAHOO SANITARY (2016-17)" |
| 0x0D66 | Interest period | "Day" |
| 0x0D67 | Interest style | "Tally" |
| 0x1038 | Default unit formal | "MTR-METERS" |

## Stock Item Fields (pidx=6)

| Field ID | Name | Example |
|----------|------|---------|
| 0x0002 | Item name | "Apco Mid Buff 4ltr" |
| 0x01F7 | HSN/Part number | "260912210" |
| 0x0FA2 | Stock category | "Default" |
| 0x0FD4 | Base unit | "Pcs" |

## GST/Tax Fields (pidx=1, various)

| Field ID | Name | Example |
|----------|------|---------|
| 0x183A | SAC code start | "00440016" |
| 0x183B | SAC code end | "00440013" |
| 0x183C | HSN chapter | "388" |
| 0x183D | Country | "India" |
| 0x183E | Service description | "Advertising Agency Services" |
| 0x183F | Classification code | "e" |
| 0x1840 | Tariff code | "00441299" |

## TDS Fields

| Field ID | Name | Example |
|----------|------|---------|
| 0x1902 | TDS section | "193", "195" |
| 0x1903 | TDS section (alt) | "193", "206C" |
| 0x1904 | TDS nature | "Commission on sale of lottery" |
| 0x1905 | TDS description | "Payment of Other Sum to NR" |
| 0x19CA | TCS section | "115WB(2)(C)" |

## Income Tax Fields

| Field ID | Name | Example |
|----------|------|---------|
| 0x151A | Residency status | "Resident", "NonResident" |
| 0x151B | Entity type | "Company", "Non Company" |
| 0x151C | Applicability | "Both" |
| 0x20D3 | Country | "India" |
| 0x20D4 | IT section | "17(1)" |
| 0x20D5 | IT section (alt) | "10(14)" |
| 0x20D6 | Deduction section | "80GGC" |

## Excise/Duty Fields

| Field ID | Name | Example |
|----------|------|---------|
| 0x1E7A | Duty type | "BED", "AED on HSD" |
| 0x1E7B | Valuation type | "On Assessable Value", "On Quantity" |
| 0x1E7C | Duty category | "Excise" |
| 0x1E7E | Credit type | "CENVAT" |

## Voucher Fields (TranMgr.1800)

| Field ID | Context | Name | Example |
|----------|---------|------|---------|
| 0x0001 | Item | Display name | "Upvc Brass Tee Sch-80" |
| 0x0002 | Item | Formal name | "Upvc Brass Tee Sch-80" |
| 0x0003 | Item | HSN code | "39172390" |
| 0x0004 | Item | Unit | "PCS" |
| 0x0006 | Invoice | Invoice number | "SS/0001/26-27" |
| 0x0008 | Invoice | Country | "India" |
| 0x000A | Voucher | GUID | "5R4OfdrYkFArvVIc" |
| 0x000D | Invoice | Party name | "Nirod Ku Behera" |
| 0x000E | Invoice | State | "Odisha" |
| 0x000F | Invoice | GST reg type | "Regular" |
| 0x0016 | Invoice | Party display | "Nirod Ku Behera" |
| 0x0017 | Invoice | Address lines | "Roda,Panibhandara" |
| 0x0018 | Invoice | Pincode | "759120" |
| 0x0023 | Invoice | Buyer GSTIN | "21ARBPB3201C3Z3" |
| 0x0025 | Invoice | Buyer address | "Roda,Panibhandara" |
| 0x0027 | Invoice | Buyer state | "Odisha" |
| 0x002A | Invoice | Buyer country | "India" |
| 0x0079 | Item | HSN (voucher level) | "39172390" |
| 0x007B | Item | Unit formal | "PCS-PIECES" |
| 0x00CE | Voucher | Party name (meta) | "Nirod Ku Behera" |
| 0x00CF | Voucher | Party address | "Roda,Panibhandara" |
| 0x0212 | GST | State | "Odisha" |
| 0x0213 | GST | GSTIN | "21AVHPS3206Q1ZC" |
| 0x07D3 | Meta | Created by | "satyananda" |
| 0x07D5 | Meta | Revision | "3" |

## Voucher Number Series Fields (pidx=1 in 0x0042)

| Field ID | Name | Example |
|----------|------|---------|
| 0x0003 | Cheque start | "311817" |
| 0x0004 | Cheque end | "311825" |
| 0x313B | Branch/location | "Kamakshyanagar" |
| 0x4E23 | Narration/note | "EWAY BILL NO-801690338118" |
| 0x4E25 | Counter | "3" |

## Total: ~130 unique field IDs mapped

## Company.1800 Fields

| Field ID | Name | Example |
|----------|------|---------|
| 0x001B | Company name | "M/S. SAHOO SANITARY (2026-27)" |
| 0x001C | Company name (formal) | "M/S. SAHOO SANITARY (2026-27)" |
| 0x001D | Address lines (repeated) | "Main Road, Kamakshyanagar." |
| 0x0066 | Email | "sahoosanitary@gmail.com" |
| 0x0067 | State | "Odisha" |
| 0x0068 | Pincode | "759018" |
| 0x006D | Country code | "+91" |
| 0x00CA | PAN | "AVHPS3206Q" |
| 0x00CC | License number | "DLC/D - 534 DT.27.04.1996" |
| 0x00CE | Registration number | "21631305175" |
| 0x00D2 | Country | "India" |
| 0x026F | Business name (display) | "Sahoo Sanitary" |
| 0x0284 | Signatory name | "Satyananda Sahoo" |
| 0x0286 | Designation | "Proprietor" |
| 0x09C6 | Price list name / Username | "GOVT. PRICE", "satyananda" |
| 0x09C7 | Invoice header name | "SAHOO SANITARY" |
| 0x09C8 | Invoice phone | "9437137555, 9668824666" |
| 0x09C9 | Signatory (invoice) | "Satyananda Sahoo" |
| 0x09CA | Contact phone | "09437137555" |
| 0x09CB | Short name | "S.Sanitary" |
| 0x09CF | Email (alt) | "prajnaagencies@gmail.com" |
| 0x13F0 | Admin username | "satyananda" |

## Total: ~155 unique field IDs mapped
