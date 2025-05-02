// /api/index.js
const express = require("express");
const bodyParser = require("body-parser");
const tesseract = require("tesseract.js");

const app = express();

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Endpoint to handle GET requests (root route)
app.get("/", (req, res) => {
  res.send("this is json challenge");
});
app.get("/test", (req, res) => {
  res.send("this is vercel test");
});
// Endpoint to handle POST requests for JSON extraction
app.post("/extract", (req, res) => {
  console.log("Received a request at /extract endpoint");
  const imageBase64 = req.body.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid 'imageBase64' in the request body.",
    });
  }

  try {
    const base64Data = imageBase64.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid base64 data");
    }

    tesseract
      .recognize(Buffer.from(base64Data, "base64"), "eng", {
        logger: (m) => console.log(m),
      })
      .then(({ data: { text } }) => {
        let extractedText = text.trim();
        extractedText = extractedText.replace(/[“”]/g, '"');
        extractedText = `{${extractedText}}`;

        let extractedData;
        try {
          extractedData = JSON.parse(extractedText);
          res.json({
            success: true,
            data: extractedData,
            message: "Successfully extracted JSON from image",
          });
        } catch (error) {
          res.status(400).json({
            success: false,
            message: "Error parsing cleaned text as JSON",
          });
        }
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: `Error extracting data from image: ${error.message}`,
        });
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error processing request: ${error.message}`,
    });
  }
});

// Export the handler function for Vercel
module.exports = app;
