#!/usr/bin/env node

// Test script to extract voucher details from the XML file
const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

// Read the XML file
const xmlContent = fs.readFileSync('./july_2025_sales_vouchers.xml', 'utf8');

// Clean XML to remove invalid characters
function cleanXmlForParsing(xmlText) {
    let cleaned = xmlText;
    
    // Remove invalid character references (control characters 0-8, 11, 12, 14-31)
    cleaned = cleaned.replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '');
    
    // Remove any remaining problematic character references
    cleaned = cleaned.replace(/&#x[0-8A-Fa-f];/g, '');
    
    // Remove actual control characters that might be in the text
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    return cleaned;
}

// Parse XML
const cleanedXml = cleanXmlForParsing(xmlContent);
const parser = new DOMParser();
const doc = parser.parseFromString(cleanedXml, 'text/xml');

// Find Tax Invoice vouchers
const vouchers = doc.querySelectorAll('VOUCHER');
const taxInvoices = Array.from(vouchers).filter(voucher => {
    const vchType = voucher.getAttribute('VCHTYPE') || '';
    return vchType === 'Tax Invoice';
});

console.log(`Found ${taxInvoices.length} Tax Invoice vouchers\n`);

// Extract details for the first Tax Invoice
if (taxInvoices.length > 0) {
    const firstInvoice = taxInvoices[0];
    
    console.log('=== TAX INVOICE DETAILS ===');
    console.log('GUID:', firstInvoice.querySelector('GUID')?.textContent);
    console.log('Voucher Number:', firstInvoice.querySelector('VOUCHERNUMBER')?.textContent);
    console.log('Date:', firstInvoice.querySelector('DATE')?.textContent);
    console.log('Party:', firstInvoice.querySelector('PARTYLEDGERNAME')?.textContent);
    console.log('Total Amount:', firstInvoice.querySelector('AMOUNT')?.textContent);
    
    console.log('\n=== INVENTORY ENTRIES ===');
    const inventoryEntries = firstInvoice.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
    
    inventoryEntries.forEach((entry, index) => {
        console.log(`\nItem ${index + 1}:`);
        console.log('  Stock Item:', entry.querySelector('STOCKITEMNAME')?.textContent);
        console.log('  Actual Qty:', entry.querySelector('ACTUALQTY')?.textContent);
        console.log('  Billed Qty:', entry.querySelector('BILLEDQTY')?.textContent);
        console.log('  Rate:', entry.querySelector('RATE')?.textContent);
        console.log('  Amount:', entry.querySelector('AMOUNT')?.textContent);
        console.log('  HSN Code:', entry.querySelector('GSTHSNNAME')?.textContent);
        
        console.log('  GST Rates:');
        const rateDetails = entry.querySelectorAll('RATEDETAILS\\.LIST');
        rateDetails.forEach(rate => {
            const dutyHead = rate.querySelector('GSTRATEDUTYHEAD')?.textContent;
            const gstRate = rate.querySelector('GSTRATE')?.textContent;
            if (dutyHead && gstRate) {
                console.log(`    ${dutyHead}: ${gstRate}%`);
            }
        });
    });
}

console.log('\n=== SUMMARY ===');
console.log(`Total vouchers in XML: ${vouchers.length}`);
console.log(`Tax Invoice vouchers: ${taxInvoices.length}`);

// Test voucher types
const voucherTypes = new Map();
vouchers.forEach(voucher => {
    const vchType = voucher.getAttribute('VCHTYPE') || 'Unknown';
    voucherTypes.set(vchType, (voucherTypes.get(vchType) || 0) + 1);
});

console.log('\nVoucher types found:');
Array.from(voucherTypes.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
