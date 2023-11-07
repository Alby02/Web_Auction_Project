import app from "./server.js"
import express from "express"
import session from "express-session"
import Store from "better-sqlite3-session-store"
import methodOverride from "method-override"
import passport from "passport"
import db from "./database.js"
import "./passport-setup.js"

const SqliteStore = Store(session);

app.set("view engine", "ejs")

app.use(express.static("public", {extensions:['html']}))
app.use(express.urlencoded({ extended: true}))
app.use(express.json())

app.use(methodOverride('_method'));

app.use(session({
    secret: process.env.SEACRET,
    resave: false,
    saveUninitialized: true,
    store: new SqliteStore({
        client: db, 
        expired: {
            clear: true,
            intervalMs: ((((0 * 24) + 8 ) * 60 + 0) * 60 + 0) * 1000 // 15min
        }
    }),
    cookie: {
        maxAge: ((((0 /*Giorni*/ * 24) + 8 /*Ore*/ ) * 60 + 0 /*Minuti*/ ) * 60 + 0 /*Secondi*/ ) * 1000 // 15min
    }
}));

app.use(passport.initialize());
app.use(passport.session());


  
