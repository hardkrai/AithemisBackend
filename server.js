const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const docxConverter = require('docx-pdf');  // Import the docx-pdf module
const { processQuery } = require('./langchain-utils');
const { extractPDFText } = require('./pdf-parser');

const app = express();
const PORT = process.env.PORT || 5001;

// Define upload and extracts directories
const uploadDir = path.join(__dirname, 'uploads');
const extractsDir = path.join(__dirname, 'extracts');

// Create directories if they don't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
if (!fs.existsSync(extractsDir)) {
  fs.mkdirSync(extractsDir);
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
    cb(null, file.originalname); // Save file with its original name temporarily
  },
});

const upload = multer({ storage });

// Function to convert DOCX to PDF using docx-pdf
async function convertDocxToPDF(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    docxConverter(inputPath, outputPath, function (err, result) {
      if (err) {
        reject(new Error(`Error converting DOCX to PDF: ${err.message}`));
      } else {
        resolve(result);
      }
    });
  });
}

// Upload file endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalFilePath = path.join(uploadDir, file.filename);
  const pdfFilePath = path.join(uploadDir, 'upload.pdf');
  const extractFilePath = path.join(extractsDir, 'extract.txt');

  try {
    const ext = path.extname(file.originalname).toLowerCase(); // Check the file extension

    if (ext === '.pdf') {
      // If the file is a PDF, rename it to "upload.pdf"
      if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath); // Remove existing PDF
      }
      fs.renameSync(originalFilePath, pdfFilePath);
    } else if (ext === '.docx') {
      // If the file is a .docx, convert it to PDF
      if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath); // Remove existing PDF
      }
      await convertDocxToPDF(originalFilePath, pdfFilePath); // Use the docx-pdf conversion
      fs.unlinkSync(originalFilePath); // Remove the original .docx file after conversion
    } else {
      // Reject unsupported file types
      fs.unlinkSync(originalFilePath);
      return res.status(400).json({ error: 'Only PDF and DOCX files are allowed' });
    }

    // Extract text from the PDF (ensure it's awaited)
    const pdfText = await extractPDFText(pdfFilePath); // Properly await the function

    if (!pdfText) {
      throw new Error('Failed to extract text from PDF');
    }

    // Save the extracted text to "extract.txt"
    if (fs.existsSync(extractFilePath)) {
      fs.unlinkSync(extractFilePath); // Remove existing extract.txt
    }
    fs.writeFileSync(extractFilePath, pdfText);

    res.status(200).json({
      message: 'File uploaded, converted, and processed successfully',
      filePath: `./uploads/upload.pdf`,
      textFilePath: `/extracts/extract.txt`,
      textPreview: pdfText.slice(0, 500), // Retain the preview of the extracted text
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process the file' });
  }
});

// Query PDF content endpoint
app.post('/query', async (req, res) => {
  try {
    const { filePath, question } = req.body;

    if (!filePath || !question) {
      return res.status(400).json({ error: 'File path and question are required.' });
    }

    const answer = await processQuery(filePath, question);

    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Failed to process the query. Please try again later.' });
  }
});

// Serve static files
app.use('/uploads', express.static(uploadDir));
app.use('/extracts', express.static(extractsDir));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
