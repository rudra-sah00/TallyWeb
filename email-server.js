const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for handling file uploads (PDF attachments)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Email configuration - Replace with your email credentials
const EMAIL_CONFIG = {
  service: 'gmail', // You can change this to your email provider
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your email
    pass: process.env.EMAIL_PASS || 'your-app-password'    // Replace with your app password
  }
};

// Create transporter
const transporter = nodemailer.createTransporter({
  service: EMAIL_CONFIG.service,
  auth: EMAIL_CONFIG.auth
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Email sending endpoint
app.post('/api/send-email', upload.single('pdf'), async (req, res) => {
  try {
    const { 
      recipientEmail, 
      invoiceNumber, 
      customerName, 
      amount, 
      date,
      gstDetails,
      items,
      companyName 
    } = req.body;

    // Validate required fields
    if (!recipientEmail || !invoiceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email and invoice number are required' 
      });
    }

    // Parse JSON strings if they come as strings
    const parsedGstDetails = typeof gstDetails === 'string' ? JSON.parse(gstDetails) : gstDetails;
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    // Create email content
    const subject = `Invoice ${invoiceNumber} - ₹${amount}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">📧 Invoice Details</h1>
          <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 15px; border-radius: 8px;">
            <h2 style="margin: 0;">Invoice #${invoiceNumber}</h2>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">📋 Invoice Information</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Date:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Customer:</strong></td>
              <td style="padding: 8px 0; color: #111827;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Total Amount:</strong></td>
              <td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">₹${amount}</td>
            </tr>
          </table>
        </div>

        ${parsedGstDetails ? `
        <div style="background: #fef7e7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">🧾 GST Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${parsedGstDetails.cgst > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">CGST (${parsedGstDetails.cgstRate}%):</td>
              <td style="padding: 5px 0; color: #111827; text-align: right;">₹${parsedGstDetails.cgst.toFixed(2)}</td>
            </tr>` : ''}
            ${parsedGstDetails.sgst > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">SGST (${parsedGstDetails.sgstRate}%):</td>
              <td style="padding: 5px 0; color: #111827; text-align: right;">₹${parsedGstDetails.sgst.toFixed(2)}</td>
            </tr>` : ''}
            ${parsedGstDetails.igst > 0 ? `
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">IGST (${parsedGstDetails.igstRate}%):</td>
              <td style="padding: 5px 0; color: #111827; text-align: right;">₹${parsedGstDetails.igst.toFixed(2)}</td>
            </tr>` : ''}
            <tr style="border-top: 1px solid #d1d5db;">
              <td style="padding: 8px 0; color: #374151; font-weight: bold;">Total GST:</td>
              <td style="padding: 8px 0; color: #f59e0b; font-weight: bold; text-align: right;">₹${parsedGstDetails.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>` : ''}

        ${parsedItems && parsedItems.length > 0 ? `
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0ea5e9;">
          <h3 style="color: #0c4a6e; margin-top: 0;">📦 Items</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb; color: #374151;">Item</th>
                  <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb; color: #374151;">Qty</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; color: #374151;">Rate</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb; color: #374151;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${parsedItems.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; color: #111827;">${item.stockItem}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #111827;">${item.quantity.toFixed(2)} ${item.unit}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827;">₹${item.rate.toFixed(2)}</td>
                  <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: bold;">₹${item.amount.toFixed(2)}</td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <p style="color: #166534; margin: 0; font-size: 16px;">
            📎 Please find the detailed PDF invoice attached to this email.
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
          <p style="margin: 5px 0;">Thank you for your business! 🙏</p>
          <p style="margin: 5px 0; font-size: 14px;">Best regards,<br><strong>${companyName || 'Your Company'}</strong></p>
        </div>
      </div>
    `;

    const textContent = `
Invoice Details

Invoice Number: ${invoiceNumber}
Date: ${date}
Customer: ${customerName}
Total Amount: ₹${amount}

${parsedGstDetails ? `GST Breakdown:
${parsedGstDetails.cgst > 0 ? `CGST (${parsedGstDetails.cgstRate}%): ₹${parsedGstDetails.cgst.toFixed(2)}` : ''}
${parsedGstDetails.sgst > 0 ? `SGST (${parsedGstDetails.sgstRate}%): ₹${parsedGstDetails.sgst.toFixed(2)}` : ''}
${parsedGstDetails.igst > 0 ? `IGST (${parsedGstDetails.igstRate}%): ₹${parsedGstDetails.igst.toFixed(2)}` : ''}
Total GST: ₹${parsedGstDetails.total.toFixed(2)}` : ''}

${parsedItems && parsedItems.length > 0 ? `Items:
${parsedItems.map(item => `• ${item.stockItem}: ${item.quantity.toFixed(2)} ${item.unit} @ ₹${item.rate.toFixed(2)} = ₹${item.amount.toFixed(2)}`).join('\n')}` : ''}

Please find the detailed PDF invoice attached to this email.

Thank you for your business!
Best regards,
${companyName || 'Your Company'}
    `;

    // Email options
    const mailOptions = {
      from: EMAIL_CONFIG.auth.user,
      to: recipientEmail,
      subject: subject,
      text: textContent,
      html: htmlContent,
      attachments: []
    };

    // Add PDF attachment if provided
    if (req.file) {
      mailOptions.attachments.push({
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: req.file.buffer,
        contentType: 'application/pdf'
      });
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/email/health', (req, res) => {
  res.json({ status: 'Email server is running', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Email server running on http://localhost:${port}`);
  console.log(`📧 Configure your email credentials in EMAIL_CONFIG or environment variables`);
  console.log(`   EMAIL_USER: ${EMAIL_CONFIG.auth.user}`);
  console.log(`   EMAIL_PASS: ${EMAIL_CONFIG.auth.pass.length > 0 ? '*'.repeat(EMAIL_CONFIG.auth.pass.length) : 'NOT_SET'}`);
});
