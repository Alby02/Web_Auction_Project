'use strict';
import "./passport-setup.js"
import db from "./database.js"
import app from "./server.js"

import express from "express"
import session from "express-session"
import Store from "better-sqlite3-session-store"
import methodOverride from "method-override"
import passport from "passport"
import busboy from "busboy"
import fs from "fs"
import path from "path"
import os from "os"


const SqliteStore = Store(session);

app.set("view engine", "ejs")

app.use(express.static("public", {extensions:['html']}))
app.use(express.urlencoded({ extended: true}))
app.use(express.json())
app.use(multipart);

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
        secure: true,
        httpOnly: true,
        maxAge: ((((0 /*Giorni*/ * 24) + 8 /*Ore*/ ) * 60 + 0 /*Minuti*/ ) * 60 + 0 /*Secondi*/ ) * 1000 // 15min
    }
}));

app.use(passport.initialize());
app.use(passport.session());

function multipart (req, res, next)
{
    if(!(req.headers["content-type"] && req.headers["content-type"].includes("multipart/form-data"))){ 
        next();
        return;
    }
    
    const bb = busboy({ headers: req.headers });
    req.body = req.body || {};
    const body = req.body;
    const files = {};
    body.files = files;

    bb.on("file", (name, file, info) => {
        //save file to os.tmpdir() for later use
        files[name] = path.join(os.tmpdir(), `${name}-${Date.now()}`);
        const writeStream = fs.createWriteStream(files[name]);
        file.pipe(writeStream);
    });

    bb.on("field", (name, val, info) => {
        body[name] = val;
    });

    bb.on("close", () =>{
        next();
    });

    bb.on("error", (err) => next(err));

    req.pipe(bb);
}