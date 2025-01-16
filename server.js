const express = require("express");
const multer = require("multer");
const fs = require("fs").promises; // Use the promise-based API
const path = require("path");
const cors = require("cors");
const mammoth = require("mammoth"); // For extracting text from DOCX files
const { processQuery } = require("./langchain-utils");
const { extractPDFText } = require("./pdf-parser");

const app = express();
const PORT = process.env.PORT || 5001;

// Define upload directory
const uploadDir = path.join(__dirname, "uploads");

// Create uploads folder if it doesn't exist
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create upload directory:", error);
  }
})();

// Enable CORS
app.use(cors());
app.use(express.json());

// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, `upload${extension}`); // Save with original extension
  },
});

// Initialize multer with the custom storage configuration
const upload = multer({ storage });

// Helper to extract text from DOCX files
const extractDocxText = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("Error extracting DOCX text:", error);
    return null;
  }
};

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (![".pdf", ".docx"].includes(fileExtension)) {
    // Delete the invalid file
    await fs.unlink(file.path);
    return res.status(400).json({ error: "Only PDF and DOCX files are allowed" });
  }

  const filePath = path.join(uploadDir, `upload${fileExtension}`);

  try {
    let extractedText;

    if (fileExtension === ".pdf") {
      extractedText = await extractPDFText(filePath);
    } else if (fileExtension === ".docx") {
      extractedText = await extractDocxText(filePath);
    }

    if (!extractedText) {
      return res.status(500).json({ error: "Failed to extract text from the file" });
    }

    return res.status(200).json({
      message: "File uploaded and processed successfully",
      filePath: `/uploads/upload${fileExtension}`,
      textExtracted: extractedText.slice(0, 500), // Return a preview of the text
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return res.status(500).json({ error: "Failed to process the file" });
  }
});

// Query endpoint (unchanged)
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

// Serve static files from the uploads directory
app.use("/uploads", express.static(uploadDir));

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
