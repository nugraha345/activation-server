const express = require("express");
const mysql = require("mysql2");
const crypto = require("crypto");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SECRET = "rahasia_siap_tuba";

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE
});

db.connect(err=>{
  if(err){
    console.log("MYSQL ERROR",err);
  }else{
    console.log("MYSQL CONNECTED");
  }
});



/*
================================
ACTIVATE DEVICE
================================
*/

app.post("/activate.php",(req,res)=>{

  const android_id = req.body.android_id;
  const shareloc = req.body.shareloc;
  const paket = req.body.paket;

  if(!android_id || !shareloc || !paket){
    return res.json({status:"error"});
  }

  const parts = shareloc.split(",");

  const lat = parts[0];
  const lng = parts[1];

  let months = 1;

  if(paket==="2Bulan") months = 2;
  if(paket==="3Bulan") months = 3;

  const expire = Date.now() + (months*30*24*60*60*1000);


  const sql = `
  INSERT INTO CLIENTSPRESENSI (android_id,lat,lng,expire,status)
  VALUES (?,?,?,?,?)
  ON DUPLICATE KEY UPDATE lat=?,lng=?`;

  db.query(sql,
    [android_id,lat,lng,expire,"pending",lat,lng],
    (err)=>{

      if(err){
        return res.json({status:"error"});
      }

      const check = "SELECT status FROM CLIENTSPRESENSI WHERE android_id=?";

      db.query(check,[android_id],(err,row)=>{

        if(err || row.length===0){
          return res.json({status:"error"});
        }

        res.json({
          status:row[0].status
        });

      });

    });

});



/*
================================
CHECK LICENSE
================================
*/

app.get("/check",(req,res)=>{

  const android_id = req.query.id;

  if(!android_id){
    return res.json({status:"invalid"});
  }

  const sql = "SELECT lat,lng,expire,status FROM CLIENTSPRESENSI WHERE android_id=? LIMIT 1";

  db.query(sql,[android_id],(err,row)=>{

    if(err){
      return res.json({status:"error"});
    }

    if(row.length===0){
      return res.json({status:"invalid"});
    }

    const data = row[0];

    if(data.status !== "active"){
      return res.json({status:"pending"});
    }

    const now = Date.now();

    if(now > data.expire){
      return res.json({status:"expired"});
    }

    const sign = crypto
      .createHash("sha256")
      .update(android_id + data.lat + data.lng + data.expire + SECRET)
      .digest("hex");

    res.json({
      status:"active",
      lat:data.lat,
      lng:data.lng,
      expire:data.expire,
      sign:sign
    });

  });

});



/*
================================
ADMIN APPROVE
================================
*/

app.get("/approve",(req,res)=>{

  const id = req.query.id;

  if(!id){
    return res.send("no id");
  }

  const sql = "UPDATE CLIENTSPRESENSI SET status='active' WHERE android_id=?";

  db.query(sql,[id],(err)=>{

    if(err){
      return res.send("error");
    }

    res.send("approved");

  });

});



/*
================================
ROOT TEST
================================
*/

app.get("/",(req,res)=>{
  res.send("Activation server running");
});



/*
================================
START SERVER
================================
*/

const PORT = process.env.PORT || 8080;

app.listen(PORT,()=>{
  console.log("Server running on port "+PORT);
});
