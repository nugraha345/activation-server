const express = require("express")
const mysql = require("mysql2")
const crypto = require("crypto")

const app = express()

app.use(express.urlencoded({extended:true}))
app.use(express.json())

const secret = "rahasia_siap_tuba"

const db = mysql.createConnection({
host:process.env.MYSQLHOST,
port:process.env.MYSQLPORT,
user:process.env.MYSQLUSER,
password:process.env.MYSQLPASSWORD,
database:process.env.MYSQLDATABASE
})

/* ===============================
ACTIVATE
================================ */

app.post("/activate.php",(req,res)=>{

const android_id = req.body.android_id
const shareloc = req.body.shareloc
const paket = req.body.paket

if(!android_id || !shareloc){
return res.json({status:"error"})
}

const parts = shareloc.split(",")

const lat = parts[0]
const lng = parts[1]

const expire = Date.now() + (30*24*60*60*1000)

const sql = `
INSERT INTO CLIENTSPRESENSI(android_id,lat,lng,expire,status)
VALUES(?,?,?,?,?)
ON DUPLICATE KEY UPDATE lat=?,lng=?`

db.query(sql,
[
android_id,
lat,
lng,
expire,
"pending",
lat,
lng
])

return res.json({status:"pending"})

})

/* ===============================
CHECK LICENSE
================================ */

app.get("/check",(req,res)=>{

const id = req.query.id

if(!id){
return res.json({status:"invalid"})
}

db.query(
"SELECT * FROM CLIENTSPRESENSI WHERE android_id=? LIMIT 1",
[id],
(err,result)=>{

if(err || result.length===0){
return res.json({status:"invalid"})
}

const row = result[0]

if(row.status !== "active"){
return res.json({status:"pending"})
}

const sign = crypto
.createHash("sha256")
.update(id + row.lat + row.lng + row.expire + secret)
.digest("hex")

return res.json({
status:"active",
lat:row.lat,
lng:row.lng,
expire:row.expire,
sign:sign
})

})

})

app.listen(process.env.PORT || 3000)
