'use strict';
import { SocketInstance } from "./server.js";
import db from './database.js';
import AuctionSocket from './AuctionSockets.js';

import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import passport from 'passport';
import e from "express";

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

router.get("/", (req, res) => {

    let row;
    if(req.query.search){
        const sql = "SELECT * FROM Asta WHERE Titolo LIKE ? OR Descrizione LIKE ? ORDER BY RANDOM() LIMIT ?";
        row = db.prepare(sql).all(req.query.search, req.query.search, 6);
    }
    else
    {
        const sql = "SELECT * FROM Asta ORDER BY RANDOM() LIMIT ?";
        row = db.prepare(sql).all(6);
    }
    
    const element = [];
    row.forEach(r => {
        element.push({Titolo: r.Titolo, Descrizione: r.Descrizione, Asta: r.ID_Asta, Creatore: r.ID_Creatore});
    })
    const luie = req.isAuthenticated() ? req.user.Tipo_Account == "Venditore" : false;
    res.render("index/index.ejs", { elementi: element, auten: req.isAuthenticated(), Auctioner: luie});
});


router.get("/register", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("parsonal");
    else
        res.sendFile("register.html", { root: './private' });
});

router.post("/register", (req, res) => {
    const salt = crypto.randomBytes(32);
    const hash_pass = crypto.pbkdf2Sync(req.body.password, salt, 10000, 64, "sha512");

    const sql = "INSERT INTO Users (FirstName, LastName, User, email, password, salt, Tipo_Account) VALUES (?, ?, ?, ?, ?, ?, ?)";
    const row = db.prepare(sql).run(req.body.nome, req.body.cognome, req.body.username, req.body.email, hash_pass, salt, req.body.Account);

    fs.mkdirSync(`data/${row.lastInsertRowid}`, { recursive: true });
    fs.createReadStream(req.body.files.immagine).pipe(sharp().avif()).pipe(fs.createWriteStream(`data/${row.lastInsertRowid}/${req.body.username}.avif`));


    res.redirect("/login");
})

router.get("/login", (req, res) =>{
    if(req.isAuthenticated())
        res.redirect("personal")
    else
        res.sendFile("login.html", { root: './private' })
});

router.post("/login", passport.authenticate('local', {
    successRedirect: '/personal',
    failureRedirect: '/'
}));

router.delete('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect(303,'/');
    });
});

router.get("/personal" , (req, res) => {
    if(req.isAuthenticated())
    {   
        const element = [];
        const sql = "SELECT * FROM Asta WHERE ID_Asta IN (SELECT ID_Asta FROM Saved_Auction WHERE ID_User = ?)";
        const row = db.prepare(sql).all(req.user.ID);
        row.forEach(r => {
            element.push({Titolo: r.Titolo, Descrizione: r.Descrizione, Asta: r.ID_Asta, Creatore: r.ID_Creatore});
        });
        const auc = req.user.Tipo_Account == "Venditore";
        res.render("personal/personal", {elementi: element, isAuctioner: auc});
    }
    else
        res.redirect("login")
});

router.get("/created", (req, res) => {
    if(req.isAuthenticated())
    {
        const element = [];
        const row = db.prepare("SELECT * FROM Asta WHERE ID_Creatore = ?").all(req.user.ID);
        row.forEach(r => {
            element.push({Titolo: r.Titolo, Descrizione: r.Descrizione, Asta: r.ID_Asta, Creatore: r.ID_Creatore});
        });
        res.render("personal/personal", {elementi: element, isCreated: true});
        
    }
    else
        res.redirect("login");
});

router.get('/asta/:ID', (req, res) => {
    const ID_Asta = req.params.ID
    const row = db.prepare("SELECT * FROM Asta WHERE ID_Asta = ?").get(ID_Asta)
    if(row.ID_Creatore == req.user.ID)
    {
        if(row.Stato == "attivo")
        {
            res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_Creatore, ID_Asta: row.ID_Asta, img: row.Img, auten: req.isAuthenticated(), Auctioner: true});
        }
        else
        {
            // selezionare la riga con l'offerta più alta
            const sqlOffertaUtenteMaggiore = "SELECT * FROM Offerta WHERE ID_Asta = ? AND Offer = (SELECT MAX(Offer) FROM Offerta WHERE ID_Asta = ?)";
            const row1 = db.prepare(sqlOffertaUtenteMaggiore).get(ID_Asta, ID_Asta)
            if(!row1)
            {
                res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_Creatore, ID_Asta: row.ID_Asta, img: row.Img, auten: req.isAuthenticated(), Auctioner: true, noffer: true});
            }
            else
            {
                //selezione dati dell'utente che ha fatto l'offerta
                const sqlUtente = "SELECT * FROM Users WHERE ID = ?";
                const row2 = db.prepare(sqlUtente).get(row1.ID_User)
                res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_Creatore, ID_Asta: row.ID_Asta, img: row.Img, auten: req.isAuthenticated(), Auctioner: true, Winner: row2.ID, Name: row2.User});
            }
        }
    }
    else
    {
        if(row.Stato == "attivo")
        {
            res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_Creatore, ID_Asta: row.ID_Asta, img: row.Img, auten: req.isAuthenticated()});
        }
        else
        {
            // ritorno qualcosa se la offerta più alta è la mia
            const sql = "SELECT * FROM Offerta WHERE ID_Asta = ? AND ID_User = ? AND Offer = (SELECT MAX(Offer) FROM Offerta WHERE ID_Asta = ?)";
            const row1 = db.prepare(sql).get(ID_Asta, req.user.ID, ID_Asta);
            const Winner = row1 ? true : false;
            res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_Creatore, ID_Asta: row.ID_Asta, img: row.Img, auten: req.isAuthenticated(), Winner: Winner});
        }
    }
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
    scade.setMinutes(scade.getMinutes() + parseInt(req.body.minuti));
    const sql = "INSERT INTO Asta (Titolo, Descrizione, Offerta_Iniziale, Scadenza, ID_Creatore, img, Stato) VALUES (?, ?, ?, ?, ?, ?, 'attivo')";
    const row = db.prepare(sql).run(req.body.titolo, req.body.descrizione, req.body.offerta, scade.toISOString(), req.user.ID, req.body.numeroImmagini);

    fs.mkdirSync(`data/${req.user.ID}/${row.lastInsertRowid}`, { recursive: true })
    let i = 0;
    for(const file in req.body.files)
    {
        i++;
        const path = `data/${req.user.ID}/${row.lastInsertRowid}/${i}.avif`;
        fs.createReadStream(req.body.files[file]).pipe(sharp().avif()).pipe(fs.createWriteStream(path));
        
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

router.get("/api/Bookmark/:ID_Asta", (req, res) => {
    const sql = "SELECT * FROM Saved_Auction WHERE ID_User = ? AND ID_Asta = ?";
    const row = db.prepare(sql).get(req.user.ID, req.params.ID_Asta);
    const isBookmarked = row ? true : false;
    res.json({Bookmarked: isBookmarked});
})

router.post("/api/Bookmark/:ID_Asta", (req, res) => {
    const sql = "INSERT INTO Saved_Auction (ID_User, ID_Asta) VALUES (?, ?)";
    try {
        const row = db.prepare(sql).run(req.user.ID, req.params.ID_Asta);
        res.status(200).end();
    }catch(e){
        res.status(400).end();
    }
})

router.delete("/api/Bookmark/:ID_Asta", (req, res) => {
    const sql = "DELETE FROM Saved_Auction WHERE ID_User = ? AND ID_Asta = ?";
    try{
        const row = db.prepare(sql).run(req.user.ID, req.params.ID_Asta);
        res.status(200).end();
    }catch(e){
        res.status(400).end();
    }
})


export default router