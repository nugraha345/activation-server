const express = require("express");
const mysql = require("mysql2");
const crypto = require("crypto");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const secret = "rahasia_siap_tuba";

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE
});

app.post("/activate.php", (req, res) => {

  const android_id = req.body.android_id;
  const shareloc = req.body.shareloc;
  const paket = req.body.paket;

  if (!android_id || !shareloc || !paket) {
    return res.json({status:"error",msg:"invalid_input"});
  }

  const parts = shareloc.split(",");
  const lat = parts[0];
  const lng = parts[1];

  let months = 1;
  if (paket === "2Bulan") months = 2;
  if (paket === "3Bulan") months = 3;

  const expire = Date.now() + (months * 30 * 24 * 60 * 60 * 1000);

  const sql = `
  INSERT INTO CLIENTSPRESENSI (android_id,lat,lng,expire,status)
  VALUES (?,?,?,?,?)
  ON DUPLICATE KEY UPDATE lat=?,lng=?,expire=?,status=?`;

  db.query(sql,
    [android_id,lat,lng,expire,"active",lat,lng,expire,"active"]
  );

  const sign = crypto
    .createHash("sha256")
    .update(android_id+lat+lng+expire+secret)
    .digest("hex");

  res.json({
    status:"success",
    lat:lat,
    lng:lng,
    expire:expire,
    sign:sign
  });

});

app.listen(process.env.PORT || 3000);

app.get("/check", (req, res) => {

  const android_id = req.query.id;

  if (!android_id) {
    return res.json({
      status: "invalid"
    });
  }

  const sql = "SELECT lat,lng,expire,status FROM CLIENTSPRESENSI WHERE android_id=? LIMIT 1";

  db.query(sql, [android_id], (err, result) => {

    if (err) {
      return res.json({ status: "error" });
    }

    if (result.length === 0) {
      return res.json({ status: "invalid" });
    }

    const row = result[0];

    const now = Date.now();

    if (row.status !== "active") {
      return res.json({ status: "invalid" });
    }

    if (now > row.expire) {
      return res.json({ status: "expired" });
    }

    res.json({
      status: "active",
      lat: row.lat,
      lng: row.lng,
      expire: row.expire
    });

  });

});
