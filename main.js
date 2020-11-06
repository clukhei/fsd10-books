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
