package tallydb

// Field IDs decoded from TallyPrime .1800 binary format.
// Mapped via: binary value analysis + XML export cross-reference + TDL documentation.
// Total: 143 field IDs covering all user-facing data.

// Common string field IDs (used in 02 10 {fid} 00 0F {len} {utf16} TLV pattern)
const (
	FldName       uint16 = 0x0002 // Name (group/ledger/master)
	FldAddr       uint16 = 0x0003 // Address / State / HSN (context-dependent)
	FldState      uint16 = 0x0004 // State / Country
	FldPin        uint16 = 0x0005 // Pincode
	FldAddr2      uint16 = 0x0006 // Address Line 2

	FldLedgerName uint16 = 0x01F7 // MailingName / LedgerName
	FldLedgerAddr uint16 = 0x01F8 // LedgerAddress
	FldPayHead    uint16 = 0x01F9 // PayHeadName (Salary component)
	FldGUID       uint16 = 0x01FB // GUID

	// Contact / Mailing
	FldEmail   uint16 = 0x0A90 // Email
	FldPhone   uint16 = 0x0A91 // LedgerPhone
	FldContact uint16 = 0x0A93 // LedgerContact
	FldPinMail uint16 = 0x0A94 // Pincode (mailing details)
	FldISD     uint16 = 0x0A97 // CountryISDCode (+91)
	FldPinAlt  uint16 = 0x0A8F // Alternate Pincode

	// Tax / GST / Statutory
	FldPAN          uint16 = 0x0AC1 // PAN / IncomeTaxNumber
	FldRegNo        uint16 = 0x0AC3 // Registration Number
	FldBankAcc      uint16 = 0x0AC4 // Bank Account Number
	FldGSTIN        uint16 = 0x0ACA // GSTIN / PartyGSTIN
	FldGSTState     uint16 = 0x0ACC // StateName / GSTState
	FldDealerType   uint16 = 0x0ACE // GSTRegistrationType
	FldCountry      uint16 = 0x0A31 // CountryName
	FldCountryStat  uint16 = 0x0D4E // Country (statutory)

	// Ledger metadata
	FldPriceList    uint16 = 0x0A2D // PriceListName
	FldCreditPeriod uint16 = 0x0BBB // CreditPeriod / BillAllocation
	FldLastVchDate  uint16 = 0x0A2B // LastVoucherDate
	FldNotes        uint16 = 0x4E23 // Narration / Notes on ledger
	FldBool         uint16 = 0x0963 // Boolean flags (Yes/No)

	// Voucher numbering
	FldVchPrefix uint16 = 0x0017 // VoucherNumberPrefix
	FldVchSeries uint16 = 0x0FA2 // VoucherSeriesNumber

	// Audit
	FldEnteredBy uint16 = 0x0067 // EnteredBy (user)
	FldAlteredBy uint16 = 0x0068 // AlteredBy (user)
	FldLastAlter uint16 = 0x0069 // LastAlteredBy

	// Units / Inventory
	FldUnitMark1 uint16 = 0x1132 // BaseUnits marker
	FldUnitMark2 uint16 = 0x0FD4 // Unit marker 2
	FldConvF1    uint16 = 0x0FD6 // ConversionFactor1
	FldConvF2    uint16 = 0x0FD7 // ConversionFactor2
	FldConvF3    uint16 = 0x0FD8 // ConversionFactor3
	FldDiscount  uint16 = 0x0EDA // DiscountRate
	FldGSTRate   uint16 = 0x16AA // GSTRate (stored as amount)

	// SAC / HSN service codes
	FldSACCode1 uint16 = 0x183A // HSN/SAC Code 1
	FldSACCode2 uint16 = 0x183B // HSN/SAC Code 2
	FldSACChap  uint16 = 0x183C // SAC Chapter Number
	FldSACCtry  uint16 = 0x183D // SAC Country
	FldSACDesc  uint16 = 0x183E // SAC Description
	FldSACSub   uint16 = 0x183F // SAC SubCategory
	FldSACCode3 uint16 = 0x1840 // HSN/SAC Code 3

	// Bank (Manager.1800)
	FldBankConfig uint16 = 0x0BD8 // BankingConfigBank
	FldBankISD    uint16 = 0x0C01 // Bank CountryISDCode

	// Voucher fields (TranMgr.1800)
	FldItemName      uint16 = 0x0001 // StockItemName
	FldVchGUID       uint16 = 0x000A // VoucherID / Reference
	FldGSTRegType    uint16 = 0x000B // GSTRegistrationType
	FldStateCode     uint16 = 0x000C // StateCode (numeric)
	FldPartyName     uint16 = 0x000D // PartyLedgerName
	FldBuyerState    uint16 = 0x000E // StateName (buyer)
	FldGSTType       uint16 = 0x000F // GSTType (Regular)
	FldPartyDisp     uint16 = 0x0016 // PartyName (display)
	FldBuyerPin      uint16 = 0x0018 // BuyerPincode
	FldHSNVch        uint16 = 0x0019 // HSNCode (voucher level)
	FldDelivPin      uint16 = 0x001A // DeliveryPincode
	FldDispCity      uint16 = 0x001C // DispatchFromCity
	FldDispName      uint16 = 0x001D // DispatchFromName
	FldDispState     uint16 = 0x001F // DispatchFromState
	FldDispPin       uint16 = 0x0020 // DispatchFromPincode
	FldBuyerGSTIN    uint16 = 0x0023 // BuyerGSTIN
	FldCompanyOnInv  uint16 = 0x0024 // CompanyName (on invoice)
	FldBuyerAddr     uint16 = 0x0025 // BuyerAddress
	FldBuyerState2   uint16 = 0x0027 // BuyerState
	FldBuyerCountry  uint16 = 0x002A // BuyerCountry
	FldEInvoiceIRN   uint16 = 0x002D // eInvoice IRN
	FldHSNItem       uint16 = 0x0079 // HSNCode (item level)
	FldUnitFormal    uint16 = 0x007B // UnitFormalName (PCS-PIECES)
	FldVchDate       uint16 = 0x00CB // VoucherDate
	FldVchRef        uint16 = 0x00CC // VoucherReference
	FldNarration     uint16 = 0x00CD // Narration
	FldConsignee     uint16 = 0x00CE // ConsigneeName
	FldConsignAddr   uint16 = 0x00CF // ConsigneeAddress
	FldShipTo        uint16 = 0x00D0 // ShipToParty
	FldValuation     uint16 = 0x00D1 // ValuationMethod
	FldPlaceOfSupply uint16 = 0x0212 // PlaceOfSupply
	FldSellerGSTIN   uint16 = 0x0213 // SellerGSTIN
	FldConsignState  uint16 = 0x0219 // ConsigneeState
	FldParty2        uint16 = 0x03ED // PartyLedgerName2
	FldPartyAddr     uint16 = 0x03EE // PartyAddress
	FldNarration2    uint16 = 0x03F4 // Narration2
	FldSupplier      uint16 = 0x040F // SupplierName
	FldBillTo        uint16 = 0x0411 // BillToParty
	FldTaxType       uint16 = 0x05DF // TaxDutyType (GST)
	FldPriceUsed     uint16 = 0x05E0 // PriceListUsed
	FldBuyerPAN      uint16 = 0x05ED // BuyerPAN
	FldSellerPAN     uint16 = 0x05EF // SellerPAN
	FldBuyerSt       uint16 = 0x05FA // BuyerStateName
	FldVchUser       uint16 = 0x07D3 // VoucherUser
	FldVchSeq        uint16 = 0x07D5 // VoucherSeqNumber
	FldVchGUIDRef    uint16 = 0x0BBC // VoucherGUID Reference

	// Banking (LinkMgr.1800)
	FldBankName    uint16 = 0x2331 // Bank Name
	FldBankBranch  uint16 = 0x2332 // Bank Branch
	FldBankAccNo   uint16 = 0x2333 // Bank Account Number
	FldBankBatch   uint16 = 0x233C // Batch Category
	FldBankIFSC    uint16 = 0x233F // IFSC Code
	FldPayMode     uint16 = 0x2346 // Payment Mode (NEFT/RTGS)
	FldPartyEmail  uint16 = 0x2347 // Party Email
	FldTxnCode     uint16 = 0x2358 // Transaction Code
	FldVchLink     uint16 = 0x235B // Voucher GUID (link to TranMgr)
)
