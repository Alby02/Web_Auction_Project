const thumbnails = document.querySelectorAll('.img-thumbnail');
const mainImage = document.querySelector('.card-img-top');

function setListeners(ID_User, ID_Asta) {
    thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => {
            mainImage.src = `/api/asta/${ID_User}/${ID_Asta}/${index + 1}`;
        });
    });    
}

// Esegui la fetch dei dati della scadenza all'avvio della pagina
async function fetchTimer(ID_Asta) {
    const response = await fetch(`/api/asta/timer/${ID_Asta}`);
    const data = await response.json();
    function updateTimer(timerData) {
    
        const countdownTimer = document.querySelector('#countdown-timer');
        const now = new Date()
        const scadenzaData = timerData
        const scadenza = new Date(scadenzaData.Scadenza)
        const timeRemaining = scadenza.getTime() - now.getTime();
        //console.log(`TimerData ${scadenza} Now ${now} timeRemaning ${timeRemaining}`)
        
        if (timeRemaining <= 0) {
            countdownTimer.innerHTML = 'Asta scaduta';
            clearInterval(timerMian)
        } else {
            const hours = Math.floor(((timeRemaining/1000)/60)/60)
            const minutes = Math.floor((timeRemaining/1000)/60)%60
            const seconds = Math.floor(timeRemaining/1000)%60;
            countdownTimer.innerHTML = `Tempo rimasto: ${hours}:${minutes}:${seconds}`;
        }
    }
    // Esegui la funzione di aggiornamento del timer ogni secondo
    const timerMian = setInterval(updateTimer, 1000, data);
}

async function fetchOfferta(ID_Asta){
    
    const valueOffer = await fetch(`/api/asta/offerta/${ID_Asta}`);
    const dataOffer = await valueOffer.json();
    offerDescription.innerHTML = `Valore dell'offerta: ${dataOffer.Offerta}€`;
}

const offerDescription = document.querySelector('#offer-description');

export { setListeners, fetchTimer, fetchOfferta };