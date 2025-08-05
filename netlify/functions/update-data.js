// Importa i moduli necessari. 'fs' per scrivere file, 'path' per gestire i percorsi.
const fs = require('fs').promises;
const path = require('path');

// Questa è la funzione principale che Netlify eseguirà.
exports.handler = async (event, context) => {
    // Recupera la chiave API di Gemini dalle variabili d'ambiente di Netlify.
    // È il modo più sicuro per gestire le chiavi segrete.
    const apiKey = process.env.GEMINI_API_KEY;

    // Se la chiave API non è stata impostata su Netlify, interrompi l'esecuzione.
    if (!apiKey) {
        console.error("GEMINI_API_KEY non è impostata.");
        return {
            statusCode: 500,
            body: 'Errore del server: Chiave API mancante.',
        };
    }

    // Il prompt per Gemini: chiediamo i dati in un formato JSON specifico.
    // Questo è il cuore della richiesta di dati.
    const prompt = `Basandoti sugli ultimi dati pubblici disponibili dall'ECDC (Centro Europeo per la Prevenzione e il Controllo delle Malattie) fino ad oggi, fornisci un array JSON di località con casi umani di Virus del Nilo Occidentale (WNV) in Europa. Ogni oggetto nell'array deve avere le seguenti proprietà: "country" (codice ISO a 2 lettere), "territory" (nome della regione/provincia), "cases" (numero aggregato di casi recenti), "latitude" (numero), e "longitude" (numero). Includi solo territori con casi confermati. Il JSON deve essere valido e contenere solo l'array. Esempio di formato: [{"country": "IT", "territory": "Piemonte", "cases": 5, "latitude": 45.07, "longitude": 7.68}]`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    try {
        // Eseguiamo la chiamata all'API di Gemini.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    // Chiediamo esplicitamente una risposta di tipo JSON.
                    responseMimeType: "application/json",
                }
            }),
        });

        // Se la risposta non è positiva, segnala un errore.
        if (!response.ok) {
            throw new Error(`Errore dall'API di Gemini: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Estrai il testo JSON dalla risposta di Gemini.
        const jsonDataText = result.candidates[0].content.parts[0].text;
        
        // Definisci il percorso dove salvare il file con i dati aggiornati.
        // Sarà un file accessibile pubblicamente nella root del sito.
        const dataFilePath = path.join(process.cwd(), 'wnv-data.json');

        // Scrivi i dati JSON nel file.
        await fs.writeFile(dataFilePath, jsonDataText, 'utf8');

        console.log('Dati WNV aggiornati con successo!');

        // Restituisci una risposta di successo.
        return {
            statusCode: 200,
            body: 'Dati aggiornati con successo.',
        };

    } catch (error) {
        console.error("Errore durante l'aggiornamento dei dati:", error);
        return {
            statusCode: 500,
            body: `Errore del server durante l'aggiornamento dei dati: ${error.message}`,
        };
    }
};
