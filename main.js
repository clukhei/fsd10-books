const express = require("express");
const hbs = require("express-handlebars");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const fetch = require("node-fetch");
const withQuery = require("with-query").default;
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000;
const morgan = require('morgan')


dotenv.config();

const baseUrl = "https://api.nytimes.com/svc/books/v3/reviews.json";

const app = express();
const pool = mysql.createPool({
	host: process.env.DB_HOST || "localhost",
	port: parseInt(process.env.DB_PORT) || 3306,
	database: process.env.DB_NAME || "goodreads",
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 4,
	timezone: "+08:00",
});

app.use(express.static(__dirname + "/static"));
app.engine("hbs", hbs({ defaultLayout: "default.hbs" }));
app.set("view engine", "hbs");
app.use(morgan('combined'))

//SQL
const SQL_GET_BOOK_LIST =
	"SELECT * FROM goodreads.book2018 WHERE title LIKE ? order by title asc limit ? offset ? ";
const SQL_COUNT_GET_BOOK_LIST =
	"SELECT count(*) as count FROM goodreads.book2018 WHERE title LIKE ?";
const SQL_GET_ONE_BOOK = "SELECT * FROM goodreads.book2018 WHERE book_id = ?";

app.get("/reviews/:title", (req, res) => {
	const title = req.params.title;
	const queryUrl = withQuery(baseUrl, {
		"api-key": `${process.env.BOOK_API_KEY}`,
		title,
	});

	fetch(queryUrl)
		.then((results) => results.json())
		.then((data) => {
			console.log(data.results);

			
				res.status(200);
				res.type("text/html");
				res.render("reviews", {
					reviews: data.results,
					title,
					hasReviews: data.num_results > 0,
				});
			 
		})
		.catch((e) => console.log("error :", e));
});
app.get("/:alphaNum/:bookId", async (req, res) => {
	const id = req.params.bookId;
	const conn = await pool.getConnection();
	try {
		const [[getBook], _] = await conn.query(SQL_GET_ONE_BOOK, [`${id}`]);
		const genres = getBook.genres.split("|");
		const authors = getBook.authors.split("|");
		console.log(getBook);
		res.status(200);
		res.type("text/html");
		res.render("detail", { getBook, genres, authors });
	} catch (e) {
		res.status(500);
		res.type("text/html");
		res.send(JSON.stringify(e));
	} finally {
		conn.release();
	}
});
app.get("/:alphaNum", async (req, res) => {
	const letter = req.params.alphaNum;
	const offset = parseInt(req.query["offset"]) || 0;
	const limit = 10;
	const conn = await pool.getConnection();
	try {
		const countResult = await conn.query(SQL_COUNT_GET_BOOK_LIST, [
			`${letter}%`,
		]);
		const count = countResult[0][0].count;
		const totalPages = Math.ceil(count / limit);
		console.log(count);
		console.log(totalPages);
		const result = await conn.query(SQL_GET_BOOK_LIST, [
			`${letter}%`,
			limit,
			offset,
		]);
		const records = result[0];
		//console.log(records)
		res.status(200);
		res.type("text/html");
		res.render("list", {
			letter,
			hasRecords: records.length > 0,
			records,
			prevOffset: Math.max(0, offset - limit),
			nextOffset: offset + limit,
			nextInactive: (offset + 10) / 10 === totalPages,
			prevInactive: offset <= 0,
		});
	} catch (e) {
		res.status(500);
		res.type("text/html");
		res.send(JSON.stringify(e));
	} finally {
		conn.release();
	}
});

app.get("/", (req, res) => {
	const alphaNum = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
	res.status(200);
	res.type("text/html");
	res.render("index", { alphaNum });
});

app.use((req, res) => {
	res.redirect("/");
});
const startApp = async (app, pool) => {
	try {
		const conn = await pool.getConnection();
		console.log("Pinging database..");
		await conn.ping();

		conn.release();

		app.listen(PORT, () => {
			console.log(`${PORT} started with dbconnection at ${new Date()}`);
		});
	} catch (e) {
		console.error("cannot ping database", e);
	}
};

startApp(app, pool);
