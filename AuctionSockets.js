import db from "./database.js";

//ho dimenticato dei this. 

class AuctionSocket{
    constructor(){
        this.Map = new Map();
        this.cheackAutionActiveOnStartSetClosedTimeout();
    }

    addSocket(resourceID, ws){
        // verifica se asta ha stato attivo
        const row = db.prepare("SELECT Stato FROM Asta WHERE ID_Asta = ?").get(resourceID);
        if(row.Stato !== 'attivo'){
            ws.close();
            return;
        }
        
        if(!this.Map.has(resourceID)){
            // aggiungi timer alla deadline
            if(!this.addTimerToDeadline(resourceID)){
                ws.close();
                return;
            }
            this.Map.set(resourceID, []);
        }

        this.Map.get(resourceID).push(ws);
    }

    removeSocket(resourceID , ws){
        const connections = this.Map.get(resourceID) || [];
        const index = connections.indexOf(ws);
        if(index !== -1){
            connections.splice(index, 1);
        }
    }

    sendToUsersConnectedAtResource(resourceID, offerta){
        const connections = this.Map.get(resourceID) || [];
        connections.forEach((ws) => {
            ws.send(JSON.stringify({offerta: offerta})); 
        });
    }

    closeSocketForResource(resourceID){
        const connections = this.Map.get(resourceID) || [];
        connections.forEach((ws) => {
            ws.close();
        });
        this.Map.delete(resourceID);
        // aggiorna stato asta a chiusa
        db.prepare("UPDATE Asta SET Stato = 'closed' WHERE ID_Asta = ?").run(resourceID);
    }
    
    verificaOfferta(resourceId, offerta, userId){
        const row = db.prepare("SELECT COALESCE((SELECT Offer FROM Offerta WHERE ID_User = ? AND ID_Asta = ?), -1) AS Mine, COALESCE((SELECT MAX(Offer) FROM Offerta WHERE ID_Asta = ?), (SELECT Offerta_Iniziale FROM Asta WHERE ID_Asta = ?)) AS Maxi").get(userId, resourceId, resourceId, resourceId);
        if(row.Maxi < offerta){
            if(row.Mine == -1){
                db.prepare("INSERT INTO Offerta (ID_Asta, ID_User, Offer) VALUES (?,?,?)").run(resourceId, userId, offerta)
            }else{
                db.prepare("UPDATE Offerta SET Offer = ? WHERE ID_Asta = ? AND ID_User = ?").run(offerta, resourceId, userId)
            }
            // Invia il messaggio a tutti gli utenti connessi alla risorsa specifica
            this.sendToUsersConnectedAtResource(resourceId, offerta)
        }        
    }

    addTimerToDeadline(resourceID){
        const row = db.prepare("SELECT Scadenza FROM Asta WHERE ID_Asta = ?").get(resourceID);
        const deadline = new Date(row.Scadenza).getTime();
        const now = new Date().getTime();
        const timeLeft = deadline - now;
        if(timeLeft > 0){
            setTimeout(() => {
                this.closeSocketForResource(resourceID);
            }, timeLeft);
            return true;
        }else{
            this.closeSocketForResource(resourceID);
            return false;
        }        
    }

    cheackAutionActiveOnStartSetClosedTimeout(){
        const rows = db.prepare("SELECT ID_Asta, Scadenza FROM Asta WHERE Stato = 'attivo'").all();
        rows.forEach((row) => {
            const deadline = new Date(row.Scadenza).getTime();
            const now = new Date().getTime();
            const timeLeft = deadline - now;
            if(timeLeft > 0){
                console.log("Asta attiva: " + row.ID_Asta);
                setTimeout(() => {
                    this.closeSocketForResource(row.ID_Asta);
                }, timeLeft);
            }else{
                console.log("Asta chiusa: " + row.ID_Asta);
                db.prepare("UPDATE Asta SET Stato = 'closed' WHERE ID_Asta = ?").run(row.ID_Asta);
            }
        });
    }
}

export default AuctionSocket;