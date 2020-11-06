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

//SQL
const SQL_GET_BOOK_LIST = 'SELECT * FROM goodreads.book2018 WHERE title LIKE ? order by title asc limit ? offset ? '
const SQL_COUNT_GET_BOOK_LIST = 'SELECT count(*) as count FROM goodreads.book2018 WHERE title LIKE ?'

app.get("/:alphaNum", async(req,res)=> {
    const letter = req.params.alphaNum
    const offset = parseInt(req.query['offset']) || 0
    const limit = 10
    const conn = await pool.getConnection()
    try{
        const result = await conn.query(SQL_GET_BOOK_LIST,[`${letter}%`,limit, offset])
        const records = result[0]
        console.log(records)
        res.status(200)
        res.type('text/html')
        res.render('list', {
            letter,
            hasRecords: records.length > 0,
            records,
            prevOffset: Math.max(0, offset - limit) ,
            nextOffset: offset + limit
        })

       
    } catch(e) {
        res.status(500)
        res.type('text/html')
        res.send(JSON.stringify(e))
    } finally {
        conn.release()
    }

})

app.get("/", (req,res)=> {
    const alphaNum = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('')
    console.log(alphaNum)
    res.status(200)
    res.type('text/html')
    res.render('index', {alphaNum})
})


app.use((req, res) => {
	res.redirect("/");
});
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
