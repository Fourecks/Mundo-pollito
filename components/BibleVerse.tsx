import React from 'react';

const verses = [
  {
    text: "Pero los que esperan en Jehová recobrarán las fuerzas. Se elevarán con alas como las águilas.",
    citation: "Isaías 40:31"
  },
  {
    text: "Porque yo, Jehová tu Dios, tengo agarrada tu mano derecha y te digo: ‘No tengas miedo. Yo te ayudaré’.",
    citation: "Isaías 41:13"
  },
  {
    text: "Puedo hacer todas las cosas gracias a aquel que me da las fuerzas.",
    citation: "Filipenses 4:13"
  },
  {
    text: "Échenle todas sus inquietudes, porque él se preocupa por ustedes.",
    citation: "1 Pedro 5:7"
  },
  {
    text: "Confía en Jehová con todo tu corazón y no te apoyes en tu propio entendimiento.",
    citation: "Proverbios 3:5"
  },
  {
    text: "Jehová es mi pastor. Nada me faltará.",
    citation: "Salmo 23:1"
  },
  {
    text: "El que aguanta hasta el fin es el que será salvado.",
    citation: "Mateo 24:13"
  },
  {
    text: "No tengas miedo, porque estoy contigo. No te angusties, porque yo soy tu Dios. Yo te daré fuerzas. Sí, yo te ayudaré. Con mi mano derecha de justicia, de veras te sostendré.",
    citation: "Isaías 41:10"
  },
  {
    text: "Tírale tu carga a Jehová, y él te sostendrá. Jamás permitirá que el justo caiga.",
    citation: "Salmo 55:22"
  },
  {
    text: "Jehová está cerca de los que tienen el corazón destrozado; salva a los que están hundidos en el desánimo.",
    citation: "Salmo 34:18"
  },
  {
    text: "Jehová es mi luz y mi salvación. ¿De quién tendré miedo? Jehová es la fortaleza de mi vida. ¿A quién le tendré pavor?",
    citation: "Salmo 27:1"
  },
  {
    text: "¿No te he ordenado yo? Sé valiente y fuerte. No te asustes ni te aterrorices, porque Jehová tu Dios está contigo vayas donde vayas.",
    citation: "Josué 1:9"
  },
  {
    text: "Vengan a mí, todos los que están cansados y agobiados, y yo los haré descansar.",
    citation: "Mateo 11:28"
  },
  {
    text: "Jehová es bueno, una fortaleza en el día de la angustia. Él se preocupa por los que se refugian en él.",
    citation: "Nahúm 1:7"
  },
  {
    text: "Cuando las preocupaciones me abrumaban, tú me consolabas y me tranquilizabas.",
    citation: "Salmo 94:19"
  },
  {
    text: "Porque estoy convencido de que ni la muerte, ni la vida, ni ángeles, ni gobiernos [...] podrá separarnos del amor de Dios.",
    citation: "Romanos 8:38, 39"
  },
  {
    text: "Jehová es el que va delante de ti. Él seguirá contigo. No te fallará ni te abandonará. No tengas miedo ni te aterrorices.",
    citation: "Deuteronomio 31:8"
  },
  {
    text: "El nombre de Jehová es una torre fuerte. El justo corre a ella y se le da protección.",
    citation: "Proverbios 18:10"
  },
  {
    text: "Mi ayuda viene de Jehová, el que hizo el cielo y la tierra.",
    citation: "Salmo 121:2"
  },
  {
    text: "Dios es nuestro refugio y nuestra fuerza, una ayuda que es fácil de encontrar en tiempos de angustia.",
    citation: "Salmo 46:1"
  },
  {
    text: "‘Porque sé muy bien lo que tengo en mente para ustedes’, afirma Jehová. ‘Quiero que tengan paz, no calamidad. Quiero darles un futuro y una esperanza’.",
    citation: "Jeremías 29:11"
  }
];

// Function to get the day of the year (1-366)
const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now as any) - (start as any);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};


const BibleVerse: React.FC = () => {
    const dayOfYear = getDayOfYear();
    const verseIndex = dayOfYear % verses.length;
    const currentVerse = verses[verseIndex];

    return (
        <div className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-2 text-center">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Texto Diario</h3>
            <div>
                <p className="text-gray-600 dark:text-gray-100 italic text-xs">“{currentVerse.text}”</p>
                <p className="text-right text-xs font-semibold text-primary-dark dark:text-primary mt-2">- {currentVerse.citation}</p>
            </div>
        </div>
    );
};

export default BibleVerse;