import express from 'express';
import busboy from 'busboy';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import db from './database.js';
import passport from 'passport';

const router = express.Router();

router.post("/register", (req, res) => {
    const bb = busboy({ headers: req.headers })
    const body = {}
    body.file = {}
    bb.on("file", (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        body.file[name] = file.pipe(sharp().avif())
    })
    bb.on("field", (name, val, info) => {
        body[name] = val
    })
    bb.on("close", () =>{
        const salt = crypto.randomBytes(32)
        const hash_pass = crypto.pbkdf2Sync(body.password, salt, 10000, 64, "sha512")
        const row = db.prepare("INSERT INTO Users (FirstName, LastName, User, email, password, salt) VALUES (?, ?, ?, ?, ?, ?)").run([body.nome, body.cognome, body.username, body.email, hash_pass, salt])
        fs.mkdirSync(`data/${row.lastInsertRowid}`, { recursive: true }) 
        //fs.writeFileSync(`data/${row.ID}/${body.username}.avif`,  buffo)
        body.file.immagine.pipe(fs.createWriteStream(`data/${row.lastInsertRowid}/${body.username}.avif`))
        res.redirect("/login")
    })
    req.pipe(bb) 
})

router.post('/login', passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/'
}));

router.get("/login", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("user")
    else
        res.sendFile("login.html", { root: './private' })
})

router.get("/register", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("user")
    else
        res.sendFile("register.html", { root: './private' })
})

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
})

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
    const bb = busboy({ headers: req.headers })
    let body = {}
    body.file = []
    bb.on("file", (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        body.file.push(file.pipe(sharp().avif()))
    })
    bb.on("field", (name, val, info) => {
        body[name] = val 
    })
    bb.on("close", () =>{
        let scade = new Date()
        scade.setDate(scade.getDate() + parseInt(body.giorni))
        scade.setHours(scade.getHours() + parseInt(body.ore))
        const row = db.prepare("INSERT INTO Asta (Titolo, Descrizione, Offerta_Iniziale, Scadenza, ID_Creatore, img, Stato) VALUES (?, ?, ?, ?, ?, ?, 'attivo')").run([body.titolo, body.descrizione, body.offerta, scade.toISOString(), req.user.ID, body.file.length])
        fs.mkdirSync(`data/${req.user.ID}/${row.lastInsertRowid}`, { recursive: true })
        let i
        let path
        for(i = 0; i < body.file.length; i++){
            path = `data/${req.user.ID}/${row.lastInsertRowid}/${i+1}.avif`
            body.file[i].pipe(fs.createWriteStream(path))
        }
        res.redirect("/")
    })
    req.pipe(bb)
})

router.get("/api/asta/offerta/:ID_Offerta", (req, res)=>{
    const row = db.prepare("SELECT COALESCE(MAX(Offer), (SELECT Offerta_Iniziale FROM Asta WHERE ID_Asta = ?)) AS Maxi FROM Offerta WHERE ID_Asta = ?").get(req.params.ID_Offerta, req.params.ID_Offerta)        
    res.json({Offerta: row.Maxi})
})

router.get("/api/asta/timer/:ID_Offerta", (req, res)=>{
    const ses = {Scadenza: (db.prepare("SELECT Scadenza FROM Asta WHERE ID_Asta = ?").get(req.params.ID_Offerta)).Scadenza}
    res.json(ses)
})


const userConnections = new Map()

// Funzione per inviare messaggi a tutti gli utenti connessi
function sendToConnectedUsers(resourceId, offerta) {
    const connections = userConnections.get(resourceId) || []

    connections.forEach((res) => {
        res.write(`data: ${JSON.stringify({offerta: offerta})}\n\n`); //invia il messaggio
    })
}

// Funzione per chiudere tutte le connessioni SSE per una risorsa specifica
function closeSSEConnectionsForResource(resourceId) {
    const connections = userConnections.get(resourceId) || [];

    connections.forEach((res) => {
        res.end(); // Chiudi la connessione SSE
    });

    // Rimuovi la risorsa dall'archivio
    userConnections.delete(resourceId);
}

// Rotta per stabilire la connessione SSE 
router.get('/api/asta/sse/:ID', (req, res) => {
    const resourceId = parseInt(req.params.ID)

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Aggiungi la connessione all'archivio 
    if (!userConnections.has(resourceId)) {
        userConnections.set(resourceId, []); // Se non è presente un archiovio per una risorsa specificaviene creato uno vuto perla risorsa
    }
    userConnections.get(resourceId).push(res);

    // Chiudi la connessione quando il client si disconnette
    req.on('close', () => {
        const connections = userConnections.get(resourceId)
        if (connections) {
            const index = connections.indexOf(res) //trovo l'indice della connessione che è stata chiusa
            if (index !== -1) {
                connections.splice(index, 1) // rimuovo la connesionechiusa 
            }
        }
    });
});

// Rotta per inviare messaggi in tempo reale ai client 
router.post('/api/asta/offerta/:ID', (req, res) => {
    const resourceId = parseInt(req.params.ID)
    const offerat = req.body.offerta
    if(!req.isAuthenticated()){
        res.status(403).end()
        return
    }
    const row = db.prepare("SELECT (SELECT Stato FROM Asta WHERE ID_Asta = ?) AS Stato, COALESCE((SELECT Offer FROM Offerta WHERE ID_User = ? AND ID_Asta = ?), -1) AS Mine, COALESCE((SELECT MAX(Offer) FROM Offerta WHERE ID_Asta = ?), (SELECT Offerta_Iniziale FROM Asta WHERE ID_Asta = ?)) AS Maxi").get(resourceId, req.user.ID, resourceId, resourceId, resourceId)
    if(row.Stato !== 'closed'){
        if(row.Maxi < offerat){
            if(row.Mine == -1){
                db.prepare("INSERT INTO Offerta (ID_Asta, ID_User, Offer) VALUES (?,?,?)").run(resourceId, req.user.ID, offerat)
            }else{
                db.prepare("UPDATE Offerta SET Offer = ? WHERE ID_Asta = ? AND ID_User = ?").run(offerat, resourceId, req.user.ID)
            }
            // Invia il messaggio a tutti gli utenti connessi alla risorsa specifica
            sendToConnectedUsers(resourceId, offerat)
        }
        res.status(200).end()
    }else{
        res.status(403).end()
    }
})

function checkAuctionNotifications() {
    const auctionsToNotify = db.prepare('SELECT * FROM Asta WHERE Stato = \'attivo\'').all()
    
    for (const auction of auctionsToNotify) {
        const timeToDeadline = new Date(auction.Scadenza) - new Date()
    
        // Controlla se l'asta è già stata gestita
        if(timeToDeadline <= 0){
            chiusaAuction(auction)
        }else if (timeToDeadline < (1000 * 60 * 60)) {
            setTimeout(() => { // Qui gestisci l'asta che è scaduta
                chiusaAuction(auction)
            }, timeToDeadline);
            // Imposta lo stato dell'asta come "notifying" per evitare notifiche duplicate
            db.prepare('UPDATE Asta SET Stato = "notifying" WHERE id = ?').run(auction.ID_Asta)
        }
    }
}

function chiusaAuction(auction){
    closeSSEConnectionsForResource(auction.ID_Asta); // Specifica l'ID della risorsa da chiudere
    // Esegui la logica per determinare il vincitore e inviare notifiche
    db.prepare("UPDATE Asta SET Stato = 'closed' WHERE ID_Asta = ?").run(auction.ID_Asta)// Imposta lo stato dell'asta come "closed" o simile
    console.log(`Asta ${auction.ID_Asta} scaduta.`);
}
    
// Esegui la verifica delle aste in scadenza ogni mezzora
setInterval(checkAuctionNotifications, 30 * 60 * 1000)

function checkAuctionNotificationsOnStartSetClosedTimeOut() {
    const auctionsToNotify = db.prepare('SELECT * FROM Asta WHERE Stato = \'notifying\'').all()
    
    for (const auction of auctionsToNotify) {
        const timeToDeadline = new Date(auction.Scadenza) - new Date()
    
        // Controlla se l'asta è già stata gestita
        if(timeToDeadline <= 0){
            chiusaAuction(auction)
        }else if (timeToDeadline < (1000 * 60 * 60)) {
            setTimeout(() => { // Qui gestisci l'asta che è scaduta
                chiusaAuction(auction)
            }, timeToDeadline);
            // Imposta lo stato dell'asta come "notifying" per evitare notifiche duplicate
            db.prepare('UPDATE Asta SET Stato = "notifying" WHERE id = ?').run(auction.ID_Asta)
        }else{
            console.log(`Qualcosa non va con ${auction.ID_Asta}`)
        }
    }
}

checkAuctionNotificationsOnStartSetClosedTimeOut()


export default router