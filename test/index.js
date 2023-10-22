if (process.env.NODE_ENV !== 'production')
{
    require("dotenv").config()
}

// modules
const express = require("express")
const crypto = require("crypto")
const session = require("express-session")
const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const sqlite3 = require("better-sqlite3")
const SqliteStore = require("better-sqlite3-session-store")(session)
const methodOverride = require('method-override');
const busboy = require('busboy');
const fs = require('fs');
const path = require('path');
//my file
//const router = require("./routes/page")

//inizilaization
const app = express()
app.set("view engine", "ejs")
const db = new sqlite3('database.db'/*,{ verbose: console.log}*/)
{
    let sql = "CREATE TABLE IF NOT EXISTS Users (ID INTEGER PRIMARY KEY AUTOINCREMENT, FirstName TEXT, LastName TEXT, User TEXT, Email TEXT NOT NULL UNIQUE, Password BLOB(128), Salt BLOB(32))";
    db.exec(sql)
    sql = "CREATE TABLE IF NOT EXISTS Asta (ID_Asta INTEGER PRIMARY KEY AUTOINCREMENT, ID_Creatore INTEGER, Scadenza TEXT, Offerta INTEGER, ID_Offerta INTEGER, Img INTEGER, Titolo TEXT, Descrizione TEXT)"
    db.exec(sql)
}
//const sessionStore = new session


//middleware
app.use(express.static("public", {extensions:['html']}))
app.use(express.urlencoded({ extended: true}))
app.use(express.json())
app.use(session({
    secret: process.env.SEACRET,
    resave: false,
    saveUninitialized: true,
    store: new SqliteStore({
        client: db, 
        expired: {
          clear: true,
          intervalMs: ((((0 * 24) + 0 ) * 60 + 15) * 60 + 0) * 1000 // 15min
        }
      }),
    cookie: {
        maxAge: ((((0 /*Giorni*/ * 24) + 0 /*Ore*/ ) * 60 + 15 /*Minuti*/ ) * 60 + 0 /*Secondi*/ ) * 1000 // 15min
    }
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))


passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
}, (email, password, done) => {
    //verifica username
    let row = db.prepare('SELECT Salt FROM Users WHERE Email = ?').get(email)
    if (!row) return done(null, false); //Username non esistente
    //verifica password
    const hash = crypto.pbkdf2Sync(password, row.Salt, 10000, 64, "sha512")
    row = db.prepare('SELECT User, ID FROM Users WHERE Email = ? AND Password = ?').get([email, hash])
    if (!row) return done(null, false); //password sbagliata
    return done(null, row); //accesso acconsentito
}))

passport.serializeUser(function (user, done) {
    return done(null, user.ID);
});

passport.deserializeUser(function (id, done) {
    let row = db.prepare('SELECT ID, User FROM Users WHERE ID = ?').get(id)
    if (!row) return done(null, false);
    return done(null, row);
});


//router

app.post("/register", (req, res) => { //TODO molto brutto da sistemare
    const bb = busboy({ headers: req.headers })
    let body = {}
    bb.on("file", (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        body.extensione = path.extname(filename)
        file.on("data", (data) => {
            body.file = data
        })
    })
    bb.on("field", (name, val, info) => {
        body[name] = val
    })
    bb.on("close", () =>{
        const salt = crypto.randomBytes(32)
        const hash_pass = crypto.pbkdf2Sync(body.password, salt, 10000, 64, "sha512")
        db.prepare("INSERT INTO Users (FirstName, LastName, User, email, password, salt) VALUES (?, ?, ?, ?, ?, ?)").run([body.FirstName, body.LastName, body.User, body.email, hash_pass, salt])
        const row = db.prepare("SELECT ID FROM Users WHERE email = ? ").get(body.email)
        fs.mkdirSync(`data/${row.ID}`, { recursive: true })
        fs.writeFileSync(`data/${row.ID}/${body.User}${body.extensione}`, body.file)
        //body.file.pipe(fs.createWriteStream(`data/${row.ID}/${body.User}.${body.extensione}`))
        res.redirect("/login")
    })
    req.pipe(bb)
})

app.post('/login', passport.authenticate('local', {
    successRedirect: '/user',
    failureRedirect: '/'
}));

app.get("/login", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("user")
    else
        res.sendFile("login.html", { root: './private' })
})

app.get("/register", (req, res) => {
    if(req.isAuthenticated())
        res.redirect("user")
    else
        res.sendFile("register.html", { root: './private' })
})

app.get("/", (req, res) => {
    let row = db.prepare("SELECT * FROM Asta ORDER BY RANDOM() LIMIT ?").all(3)
    let element = []
    row.forEach(r => {
        element.push({Titolo: r.Titolo, Descrizione: r.Descrizione, Asta: r.ID_Asta, Creatore: r.ID_Creatore})
    })
    res.render("index.ejs", { elementi: element, auten: req.isAuthenticated()})
    //fare la quari delle aste dal database aste Random
})

app.get("/user", (req, res) => {
    if(req.isAuthenticated())
        res.render("user", { name: req.user.User})
    else
        res.redirect("login")

    //fare la gestione e modifica dell'account
})

app.delete('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect(303,'/login');
    });
});

app.get('/asta/:ID', (req, res) => {
    const ID_Asta = req.params.ID
    const row = db.prepare("SELECT * FROM Asta WHERE ID_Asta = ?").get(ID_Asta)
    res.render("Asta", { Titolo: row.Titolo, Descrizione: row.Descrizione, User_ID: row.ID_User, ID_Asta: row.ID_Asta, img: 1})
})

app.get('/api/asta/:ID_User/:ID_Asta/:ID_IMG', (req, res) => {
    // Percorso recupero immagini dell'asta
    const imagePath = req.params.ID_User + "/" + req.params.ID_Asta + "/" + req.params.ID_IMG + ".jpg" 

    // Invia l'immagine come risposta
    res.sendFile(imagePath, { root: './data' });
});

app.get('/UserImg', (req, res) => {
    // Path all'immagine dell'utente autenticato
    const imagePath = req.user.ID + "/" + req.user.User + ".jpg"

    // Invia l'immagine come risposta
    res.sendFile(imagePath, { root: './data' });
});

app.get('/api/UserImg/:User_ID/:User', (req, res) => {
    // Path all'immagine dell'utente specificato
    const imagePath = req.params.User_ID + "/" + req.params.User + ".jpg"

    // Invia l'immagine come risposta
    res.sendFile(imagePath, { root: './data' });
});

app.get("/Crea_Asta", (req, res) => {
    if(req.isAuthenticated())
        res.render("Crea", { name: req.user.User})
    else
        res.redirect("login")

    //fare la gestione e modifica dell'account
})

app.post("/Crea_Asta", (req, res) => { //TODO molto brutto da sistemare
    const bb = busboy({ headers: req.headers })
    let body = {}
    body.file = []
    bb.on("file", (name, file, info) => {
        const { filename, encoding, mimeType } = info;
        let filemisc = {extensione: path.extname(filename)}
        file.on("data", (data) => {
            filemisc.data = data
            body.file.push(filemisc)
        })
    })
    bb.on("field", (name, val, info) => {
        body[name] = val 
    })
    bb.on("close", () =>{
        const row = db.prepare("INSERT INTO Asta (Titolo, Descrizione, ID_Creatore, img) VALUES (?, ?, ?, ?)").run([body.Titolo, body.Descrizione, req.user.ID, body.file.length])
        fs.mkdirSync(`data/${req.user.ID}/${row.lastInsertRowid}`, { recursive: true })
        let i
        let path
        for(i = 0; i < body.file.length; i++){
            path = `data/${req.user.ID}/${row.lastInsertRowid}/${i+1}${body.file[i].extensione}`
            fs.writeFileSync(path, body.file[i].data)
        }
        res.redirect("/")
    })
    req.pipe(bb)
})

//app.use("/", router)


//TODO busboy

app.listen(3000);