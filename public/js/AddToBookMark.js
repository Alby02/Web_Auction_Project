
function SetBookMark(ID_Asta)
{
    // seleziona il bottone
    const bookmarkButton = document.querySelector('#bookmark-button');

    // invia una richiesta al server per verificare se Asta è nei bookmark
    fetch(`/api/Bookmark/${ID_Asta}`)
        .then(response => response.json())
        .then(data => {
            // cambia lo stato dell'icona e invia una richiesta al server per aggiungere o rimuovere Asta dai bookmark
            if (data.Bookmarked) {
                bookmarkButton.classList.add('bi-bookmark-fill');
            } else {
                bookmarkButton.classList.add('bi-bookmark');
            }
            isBookmarked = data.Bookmarked;
        })
        .catch(error => {
            console.error(error);
        });


    let isBookmarked;

    // aggiungi un listener per il click
    bookmarkButton.addEventListener('click', async () => {
        if (isBookmarked) {
            await fetch(`/api/Bookmark/${ID_Asta}`, { method: 'DELETE' });
            bookmarkButton.classList.remove('bi-bookmark-fill');
            bookmarkButton.classList.add('bi-bookmark');            
        } else {
            await fetch(`/api/Bookmark/${ID_Asta}`, { method: 'POST' });
            bookmarkButton.classList.remove('bi-bookmark');
            bookmarkButton.classList.add('bi-bookmark-fill');
        }
        isBookmarked = !isBookmarked;
    });
}

export default SetBookMark;
