package tallydb

// Field IDs decoded from .1800 binary format.
const (
	// Common
	FldName   uint16 = 0x0002 // Group/Master name
	FldAddr   uint16 = 0x0003 // Address/description
	FldState  uint16 = 0x0004 // State/Country/Date
	FldPin    uint16 = 0x0005 // Pincode
	FldAddr2  uint16 = 0x0006 // Address line 2
	FldGUID   uint16 = 0x01FB // Record GUID

	// Ledger-specific
	FldLedgerName uint16 = 0x01F7 // Ledger name (in Manager.1800)
	FldLedgerAddr uint16 = 0x01F8 // Ledger address lines

	// Contact
	FldEmail   uint16 = 0x0A90 // Email
	FldPhone   uint16 = 0x0A91 // Phone
	FldFax     uint16 = 0x0A92 // Fax
	FldContact uint16 = 0x0A93 // Contact person
	FldMobile  uint16 = 0x0A94 // Mobile/alt phone

	// Tax/GST
	FldPAN       uint16 = 0x0AC1 // PAN number
	FldGSTIN     uint16 = 0x0ACA // GSTIN
	FldGSTState  uint16 = 0x0ACC // GST State
	FldDealerTyp uint16 = 0x0ACE // Dealer type (Regular/Composite)
	FldBankAcc   uint16 = 0x0AC4 // Bank account number

	// Boolean
	FldBool uint16 = 0x0963 // Yes/No flags

	// Company
	FldCompanyName uint16 = 0x0D50 // Company name
	FldIFSC        uint16 = 0x0D4C // IFSC code
	FldCountry     uint16 = 0x0D4E // Country

	// User
	FldUser uint16 = 0x0067 // Created by user

	// Voucher (TranMgr.1800)
	FldVchNarration uint16 = 0x00CD // Narration
	FldVchUser      uint16 = 0x07D3 // Voucher user
	FldVchSeq       uint16 = 0x07D5 // Voucher sequence
	FldVchGUID      uint16 = 0x0BBC // Voucher GUID reference
)
