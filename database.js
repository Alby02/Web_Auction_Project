import sqlite3 from "better-sqlite3";

function initializeDatabase() {
    // Inizializzare il database
    const db = new sqlite3('database.db', /*,{ verbose: console.log}*/);
  
    // Creazione Tabelle
    const User_Table = "CREATE TABLE IF NOT EXISTS Users (ID INTEGER PRIMARY KEY AUTOINCREMENT, FirstName TEXT, LastName TEXT, User TEXT, Email TEXT NOT NULL UNIQUE, Password BLOB(128), Salt BLOB(32), Coda_Notifiche TEXT)"
    db.exec(User_Table)
    const Auction_Table = "CREATE TABLE IF NOT EXISTS Asta (ID_Asta INTEGER PRIMARY KEY AUTOINCREMENT, ID_Creatore INTEGER, Scadenza TEXT, Offerta_Iniziale INTEGER, Img INTEGER, Titolo TEXT, Descrizione TEXT, Stato TEXT)"
    db.exec(Auction_Table)
    const Offer_Table = "CREATE TABLE IF NOT EXISTS Offerta (ID_Asta INTEGER, ID_User INTEGER, Offer INTEGER, PRIMARY KEY (ID_Asta, ID_User))"
    db.exec(Offer_Table)

    //ritona il database setuppato
    return db;
}

export default initializeDatabase;
