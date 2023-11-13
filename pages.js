'use strict';
import { SocketInstance } from "./server.js";
import db from './database.js';
import AuctionSocket from './AuctionSockets.js';

import express from 'express';
import busboy from 'busboy';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import passport from 'passport';

const router = express.Router();
SocketInstance.applyTo(router);

const auctionSocket = new AuctionSocket();

router.ws('/auction/:ID', (ws, req) => {
    
    const resourceId = req.params.ID;

    auctionSocket.addSocket(resourceId, ws);
    
    ws.on('message', (msg) => {
        if(!req.isAuthenticated()){
            return;
        }
        const offerta = JSON.parse(msg).offerta;
        auctionSocket.verificaOfferta(resourceId, offerta, req.user.ID);
    });

    ws.on('close', () => {
        // Rimuovi la connessione dall'archivio
        auctionSocket.removeSocket(resourceId, ws);
    });
});

router.get("/register", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("user")
    else
        res.sendFile("register.html", { root: './private' })
})

router.post("/register", (req, res) => {
    const salt = crypto.randomBytes(32);
    const hash_pass = crypto.pbkdf2Sync(req.body.password, salt, 10000, 64, "sha512");

    const sql = "INSERT INTO Users (FirstName, LastName, User, email, password, salt) VALUES (?, ?, ?, ?, ?, ?)";
    const row = db.prepare(sql).run(req.body.nome, req.body.cognome, req.body.username, req.body.email, hash_pass, salt);

    fs.mkdirSync(`data/${row.lastInsertRowid}`, { recursive: true });
    req.body.files.immagine.pipe(sharp().avif()).pipe(fs.createWriteStream(`data/${row.lastInsertRowid}/${req.body.username}.avif`));

    res.redirect("/login");
})

router.get("/login-merchant", (req, res) =>{
    if(req.isAuthenticated())
        res.redirect("merchant")
    else
        res.sendFile("login-merchant.html", { root: './private' })
});

router.post("/login-merchant", passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/'
}));

router.get("/login", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("user")
    else
        res.sendFile("login.html", { root: './private' })
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/'
}));

router.get("/", (req, res) => {
    let row = db.prepare("SELECT * FROM Asta ORDER BY RANDOM() LIMIT ?").all(6)
    let element = []
    row.forEach(r => {
        element.push({Titolo: r.Titolo, Descrizione: r.Descrizione, Asta: r.ID_Asta, Creatore: r.ID_Creatore})
    })
    res.render("index.ejs", { elementi: element, auten: req.isAuthenticated()})
    //fare la quari delle aste dal database aste Random
})

router.get("/user", (req, res) => {
    if(req.isAuthenticated()){
        let element = []
        const row = db.prepare("SELECT * FROM Asta WHERE ID_Creatore = ?").all(req.user.ID)
        row.forEach(r => {
            element.push({Titolo: r.Titolo, Descrizione: r.Descrizione, Asta: r.ID_Asta, Creatore: r.ID_Creatore})
        })
        res.render("user", {elementi: element})
    }
    else
        res.redirect("login")

    //fare la gestione e modifica dell'account
});

router.get("/merchant", (req, res) => {

});

router.delete('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect(303,'/');
    });
});

router.get('/asta/:ID', (req, res) => {
    const ID_Asta = req.params.ID
    const row = db.prepare("SELECT * FROM Asta WHERE ID_Asta = ?").get(ID_Asta)
    res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_Creatore, ID_Asta: row.ID_Asta, img: row.Img, auten: req.isAuthenticated()})
})

router.get('/api/asta/:ID_User/:ID_Asta/:ID_IMG', (req, res) => {
    // Percorso recupero immagini dell'asta
    const imagePath = req.params.ID_User + "/" + req.params.ID_Asta + "/" + req.params.ID_IMG + ".avif" 

    // Invia l'immagine come risposta
    res.sendFile(imagePath, { root: './data' });
});

router.get('/UserImg', (req, res) => {
    // Path all'immagine dell'utente autenticato
    const imagePath = req.user.ID + "/" + req.user.User + ".avif"

    // Invia l'immagine come risposta
    res.sendFile(imagePath, { root: './data' });
});

router.get('/api/UserImg/:User_ID/:User', (req, res) => {
    // Path all'immagine dell'utente specificato
    const imagePath = req.params.User_ID + "/" + req.params.User + ".avif"

    // Invia l'immagine come risposta
    res.sendFile(imagePath, { root: './data' });
});

router.get("/Crea_Asta", (req, res) => {
    if(req.isAuthenticated())
        res.render("Crea", { name: req.user.User})
    else
        res.redirect("login")

    //fare la gestione e modifica dell'account
})

router.post("/Crea_Asta", (req, res) => {
    const scade = new Date();
    scade.setDate(scade.getDate() + parseInt(req.body.giorni));
    scade.setHours(scade.getHours() + parseInt(req.body.ore));

    const sql = "INSERT INTO Asta (Titolo, Descrizione, Offerta_Iniziale, Scadenza, ID_Creatore, img, Stato) VALUES (?, ?, ?, ?, ?, ?, 'attivo')";
    const row = db.prepare(sql).run(req.body.titolo, req.body.descrizione, req.body.offerta, scade.toISOString(), req.user.ID, req.body.files.length);

    fs.mkdirSync(`data/${req.user.ID}/${row.lastInsertRowid}`, { recursive: true })
    let i = 0;
    for(const file in req.body.files)
    {
        i++;
        const path = `data/${req.user.ID}/${row.lastInsertRowid}/${i}.avif`;
        req.body.files[file].pipe(sharp().avif()).pipe(fs.createWriteStream(path));
    }

    res.redirect("/");
})

router.get("/api/asta/offerta/:ID_Offerta", (req, res)=>{
    const row = db.prepare("SELECT COALESCE(MAX(Offer), (SELECT Offerta_Iniziale FROM Asta WHERE ID_Asta = ?)) AS Maxi FROM Offerta WHERE ID_Asta = ?").get(req.params.ID_Offerta, req.params.ID_Offerta)        
    res.json({Offerta: row.Maxi})
})

router.get("/api/asta/timer/:ID_Offerta", (req, res)=>{
    const ses = {Scadenza: (db.prepare("SELECT Scadenza FROM Asta WHERE ID_Asta = ?").get(req.params.ID_Offerta)).Scadenza}
    res.json(ses)
})


export default router