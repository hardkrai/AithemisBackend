const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { processQuery } = require('./langchain-utils');
const { extractPDFText } = require('./pdf-parser');
const serverless = require('serverless-http');

const app = express();
const PORT = process.env.PORT || 5001;

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'upload.pdf');
  },
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
    await fs.unlink(file.path);
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }

  const filePath = path.join(uploadDir, 'upload.pdf');
  try {
    const pdfText = await extractPDFText(filePath);

    if (!pdfText) {
      return res.status(500).json({ error: 'Failed to extract text from PDF' });
    }

    return res.status(200).json({
      message: 'File uploaded and processed successfully',
      filePath: `/uploads/upload.pdf`,
      textExtracted: pdfText.slice(0, 500),
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return res.status(500).json({ error: 'Failed to process the file' });
  }
});

app.post("/query", async (req, res) => {
  try {
    const { filePath, question } = req.body;

    if (!filePath || !question) {
      return res.status(400).json({ error: "File path and question are required." });
    }

    const answer = await processQuery(filePath, question);

    res.status(200).json({ answer });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({ error: "Failed to process the query. Please try again later." });
  }
});

app.use('/uploads', express.static(uploadDir));

module.exports.handler = serverless(app); // Serverless wrapper

