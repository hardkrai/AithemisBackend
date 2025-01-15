const express = require('express');
const multer = require('multer');
const fs = require('fs') // Use the promise-based API
const path = require('path');
const cors = require('cors');
const { processQuery } = require('./langchain-utils');
const { extractPDFText } = require('./pdf-parser');

const app = express();
const PORT = process.env.PORT || 5001; // Use PORT from environment variables or default to 5001

// Define upload directory
const uploadDir = path.join(__dirname, 'uploads');

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Enable CORS
app.use(cors());
app.use(express.json());

// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'upload.pdf'); // Always save as "upload.pdf"
  },
});

// Initialize multer with the custom storage configuration
const upload = multer({ storage });

// Upload PDF endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Ensure the file is a PDF
  if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
    // Delete the invalid file
    await fs.unlink(file.path);
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }

  const filePath = path.join(uploadDir, 'upload.pdf');

  // Extract text from the PDF
  try {
    const pdfText = await extractPDFText(filePath);

    if (!pdfText) {
      return res.status(500).json({ error: 'Failed to extract text from PDF' });
    }

    return res.status(200).json({
      message: 'File uploaded and processed successfully',
      filePath: `/uploads/upload.pdf`, // Public path for the uploaded file
      textExtracted: pdfText.slice(0, 500), // Return a preview of the text
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return res.status(500).json({ error: 'Failed to process the file' });
  }
});

// Query PDF content endpoint
app.post("/query", async (req, res) => {
  try {
    const { filePath, question } = req.body;

    if (!filePath || !question) {
      return res.status(400).json({ error: "File path and question are required." });
    }

    // Process the query using langchain-utils
    const answer = await processQuery(filePath, question);

    res.status(200).json({ answer });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ error: "Failed to process the query. Please try again later." });
  }
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
