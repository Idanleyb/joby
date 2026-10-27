import ALL from "./il-localities.json";

/** Largest towns first, for suggestions. */
const MAJOR = [
  "תל אביב-יפו", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה", "אשדוד", "נתניה", "באר שבע", "חולון", "בני ברק",
  "רמת גן", "אשקלון", "רחובות", "בת ים", "בית שמש", "כפר סבא", "הרצליה", "חדרה", "מודיעין-מכבים-רעות", "רעננה",
  "לוד", "רמלה", "נצרת", "הוד השרון", "ראש העין", "קריית גת", "קריית אתא", "עפולה", "אילת", "נהריה",
  "גבעתיים", "קריית מוצקין", "כרמיאל", "טבריה", "קריית שמונה", "שדרות", "נתיבות", "אופקים", "דימונה", "יבנה",
  "אור יהודה", "קריית ביאליק", "צפת", "אריאל", "מעלה אדומים", "יהוד-מונוסון", "גדרה", "נס ציונה", "אלעד", "זכרון יעקב",
];

/**
 * Every Israeli locality (1,263, CBS list with coordinates in the database table il_cities),
 * the largest first. Town names must match that table for distance matching to work.
 */
export const IL_CITIES: string[] = [...MAJOR, ...(ALL as string[]).filter((c) => !MAJOR.includes(c))];
