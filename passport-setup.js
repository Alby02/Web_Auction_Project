import db from "./database.js"

import {Strategy as LocalStrategy} from "passport-local"
import crypto from "crypto"
import passport from "passport"

passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
}, (email, password, done) => {
    //verifica username
    let row = db.prepare('SELECT Salt FROM Users WHERE Email = ?').get(email)
    if (!row) return done(null, false) //Username non esistente
    //verifica password
    const hash = crypto.pbkdf2Sync(password, row.Salt, 10000, 64, "sha512")
    row = db.prepare('SELECT User, ID FROM Users WHERE Email = ? AND Password = ?').get([email, hash])
    if (!row) return done(null, false) //password sbagliata
    return done(null, row) //accesso acconsentito
}))

// Serializzazione e deserializzazione degli utenti
passport.serializeUser(function (user, done) {
    return done(null, user.ID);
});

passport.deserializeUser(function (id, done) {
    let row = db.prepare('SELECT ID, User FROM Users WHERE ID = ?').get(id)
    if (!row) return done(null, false)
    return done(null, row)
})







