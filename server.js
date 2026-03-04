const express = require("express");
const mysql = require("mysql2");
const crypto = require("crypto");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const secret = "rahasia_siap_tuba";

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
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
