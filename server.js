const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const BOOKINGS_FILE = path.join(__dirname, "bookings.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const requiredFields = [
  "fullName",
  "phone",
  "location",
  "carType",
  "serviceType",
  "preferredTime"
];

async function readBookings() {
  try {
    const raw = await fs.readFile(BOOKINGS_FILE, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      await fs.writeFile(BOOKINGS_FILE, "[]", "utf8");
      return [];
    }

    throw error;
  }
}

async function writeBookings(bookings) {
  await fs.writeFile(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf8");
}

function sanitizeBooking(body) {
  return requiredFields.reduce((booking, field) => {
    booking[field] = String(body[field] || "").trim();
    return booking;
  }, {});
}

function validateBooking(booking) {
  return requiredFields.filter((field) => !booking[field]);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.post("/book", async (req, res) => {
  try {
    const booking = sanitizeBooking(req.body);
    const missingFields = validateBooking(booking);

    if (missingFields.length) {
      return res.status(400).json({
        message: "Please complete all booking fields.",
        missingFields
      });
    }

    const bookings = await readBookings();
    const savedBooking = {
      id: `booking_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...booking
    };

    bookings.push(savedBooking);
    await writeBookings(bookings);

    return res.status(201).json({
      message: "We will contact you soon via Messenger or phone.",
      booking: savedBooking
    });
  } catch (error) {
    console.error("Booking save failed:", error);
    return res.status(500).json({
      message: "Booking could not be saved right now."
    });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const bookings = await readBookings();

    if (req.query.format === "json") {
      return res.json(bookings);
    }

    const rows = bookings
      .map(
        (booking) => `
          <tr>
            <td>${escapeHtml(booking.createdAt)}</td>
            <td>${escapeHtml(booking.fullName)}</td>
            <td>${escapeHtml(booking.phone)}</td>
            <td>${escapeHtml(booking.location)}</td>
            <td>${escapeHtml(booking.carType)}</td>
            <td>${escapeHtml(booking.serviceType)}</td>
            <td>${escapeHtml(booking.preferredTime)}</td>
          </tr>
        `
      )
      .join("");

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Bookings Admin View</title>
          <style>
            body {
              margin: 0;
              padding: 32px;
              color: #142436;
              font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #f3fbff;
            }
            h1 { margin-top: 0; }
            .table-wrap {
              overflow-x: auto;
              background: #fff;
              border: 1px solid #dce9f5;
              border-radius: 18px;
              box-shadow: 0 14px 34px rgba(20, 36, 54, .1);
            }
            table {
              width: 100%;
              min-width: 900px;
              border-collapse: collapse;
            }
            th, td {
              padding: 14px 16px;
              border-bottom: 1px solid #dce9f5;
              text-align: left;
              vertical-align: top;
            }
            th {
              color: #0d5fb3;
              background: #eef8ff;
              font-size: .9rem;
            }
            tr:last-child td { border-bottom: 0; }
            .empty {
              padding: 24px;
              color: #5f7182;
            }
            a {
              color: #0d5fb3;
              font-weight: 800;
            }
          </style>
        </head>
        <body>
          <h1>Bookings Admin View</h1>
          <p><a href="/">Back to website</a> | <a href="/bookings?format=json">View JSON</a></p>
          <div class="table-wrap">
            ${
              bookings.length
                ? `<table>
                    <thead>
                      <tr>
                        <th>Submitted</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Location</th>
                        <th>Car Type</th>
                        <th>Service</th>
                        <th>Preferred Time</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>`
                : `<div class="empty">No bookings yet.</div>`
            }
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Bookings read failed:", error);
    return res.status(500).send("Could not load bookings.");
  }
});

app.listen(PORT, () => {
  console.log(`Mobile car wash website running at http://localhost:${PORT}`);
});
