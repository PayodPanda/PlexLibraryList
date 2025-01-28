const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const sharp = require('sharp');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Plex API details
const PLEX_SERVER = process.env.PLEX_SERVER;
const PLEX_TOKEN = process.env.PLEX_TOKEN;
const ALLOWED_SECTION_IDS = [6, 5, 1, 2]; // Only these library sections
const DATA_DIR = path.join(__dirname, "data");
const IMAGES_DIR = path.join(__dirname, "images");

// Ensure required directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

// Middleware to serve static files
app.use(express.static("html"));
app.use("/images", express.static(IMAGES_DIR));

// Fetch and save Plex data locally
async function fetchAndSavePlexData() {
  try {
    const allLibraries = [];

    for (const sectionId of ALLOWED_SECTION_IDS) {
      try {
        // Fetch library section info (to get the title)
        const sectionInfoResponse = await axios.get(
          `${PLEX_SERVER}/library/sections/${sectionId}`,
          { params: { "X-Plex-Token": PLEX_TOKEN } }
        );

        const sectionTitle = sectionInfoResponse.data.MediaContainer.title1; // Extract section title
        // console.log(`Fetched section title: ${sectionTitle} for section ID: ${sectionId}`);

        // Fetch all items in the section
        const response = await axios.get(
          `${PLEX_SERVER}/library/sections/${sectionId}/all`,
          { params: { "X-Plex-Token": PLEX_TOKEN } }
        );

        const library = response.data.MediaContainer.Metadata.map(item => {
          if (!item.thumb) {
            console.warn(`Skipping item with missing thumb: ${item.title}`);
            return null;
          }

          const imageUrl = `${PLEX_SERVER}${item.thumb}?X-Plex-Token=${PLEX_TOKEN}`;

          const imageFileNameHiRes = `${item.ratingKey}-hi.jpg`;
          const imageFileName400 = `${item.ratingKey}-400.jpg`;
          const imageFileName200 = `${item.ratingKey}-200.jpg`;
          const imagePathHiRes = path.join(IMAGES_DIR, imageFileNameHiRes);
          const imagePath400 = path.join(IMAGES_DIR, imageFileName400);
          const imagePath200 = path.join(IMAGES_DIR, imageFileName200);

          // Download the images
          axios({
            method: "get",
            url: imageUrl,
            responseType: "stream",
          }).then(response => {
            response.data.pipe(fs.createWriteStream(imagePathHiRes));
            response.data
              .pipe(sharp().resize({ width: 400 }))
              .pipe(fs.createWriteStream(imagePath400));
            response.data
              .pipe(sharp().resize({ width: 200 }))
              .pipe(fs.createWriteStream(imagePath200));
          }).catch(err => console.error(`Error downloading image: ${imageUrl}`, err));

          return {
            id: item.ratingKey,
            title: item.title,
            year: item.year,
            image200: `/images/${imageFileName200}`,
            image400: `/images/${imageFileName400}`,
            imageHiRes: `/images/${imageFileNameHiRes}`
          };
        });

        // Add to allLibraries array with section title
        allLibraries.push({ sectionId, sectionTitle, items: library.filter(Boolean) });
      } catch (err) {
        console.error(`Error processing section ID ${sectionId}:`, err.message);
      }
    }

    // Save all libraries to JSON
    const libraryDataPath = path.join(DATA_DIR, "library.json");
    fs.writeFileSync(libraryDataPath, JSON.stringify(allLibraries, null, 2));
    console.log("Library data updated.");

  } catch (error) {
    console.error("Error fetching Plex data:", error.message);
  }
}

// Fetch Plex data when the server starts
fetchAndSavePlexData();

// Endpoint to fetch the library JSON file
app.get("/data/library.json", (req, res) => {
  const libraryDataPath = path.join(DATA_DIR, "library.json");

  if (fs.existsSync(libraryDataPath)) {
    res.sendFile(libraryDataPath);
  } else {
    res.status(404).send("Library data not found.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
