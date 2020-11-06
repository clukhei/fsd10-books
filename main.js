const express = require('express')
const hbs = require('express-handlebars')
const dotenv = require('dotenv')
const mysql = require('mysql2/promise')
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000
dotenv.config()
const app = express()
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT)|| 3306,
    database: process.env.DB_NAME || 'goodreads',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
    timezone: '+08:00'
})

app.use(express.static(__dirname + "/static"))
app.engine("hbs", hbs({defaultLayout: "default.hbs"}))
app.set("view engine", "hbs")

app.get("/", (req,res)=> {
    const alphaNum = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('')
    console.log(alphaNum)
    res.status(200)
    res.type('text/html')
    res.render('index', {alphaNum})
})
const startApp = async(app, pool) => {
    try{
        const conn = await pool.getConnection()
        console.log('Pinging database..')
        await conn.ping()

        conn.release()

        app.listen(PORT, ()=> {
            console.log(`${PORT} started with dbconnection at ${new Date()}`)
        })
    }catch(e) {
        console.error('cannot ping database', e)
    }
}

startApp(app, pool)
