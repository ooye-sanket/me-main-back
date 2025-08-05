const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL ||  'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/contact', limiter);

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  console.log('📧 Contact form submission received:', req.body);
  
  try {
    const { name, email, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      console.log('❌ Validation failed: Missing fields');
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Validation failed: Invalid email format');
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    console.log('✅ Validation passed, preparing email...');

    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAIL,
      subject: `New Contact Form Message from ${name}`,
      html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #1a1a2e; margin-bottom: 20px;">New Contact Form Submission</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #2c5bff; margin-bottom: 15px;">Contact Details:</h3>
              <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #2c5bff; margin-bottom: 15px;">Message:</h3>
              <p style="line-height: 1.6; color: #333;">${message}</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 8px; border-left: 4px solid #2c5bff;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                This message was sent from your contact form on ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        New Contact Form Submission
        
        Name: ${name}
        Email: ${email}
        
        Message:
        ${message}
        
        Sent on: ${new Date().toLocaleString()}
      `
    };

    console.log('📤 Sending email to:', process.env.RECIPIENT_EMAIL);

    // Send email
    await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Message sent successfully! I will get back to you within 48 hours.'
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running properly',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Ready to send emails to: ${process.env.RECIPIENT_EMAIL}`);
});