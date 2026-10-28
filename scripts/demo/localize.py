"""Localize the Joby demo dataset to Hebrew (display strings only; ids and enums stay English)."""
import json, re, csv

D = json.load(open("out/joby_demo_data.json"))

CAT = {"Design": "עיצוב", "Programming & Tech": "תכנות וטכנולוגיה", "Digital Marketing": "שיווק דיגיטלי", "Music & Audio": "מוזיקה ואודיו",
       "Business": "עסקים", "Finance": "פיננסים", "Consulting": "ייעוץ", "Lawyers": "עורכי דין", "Household": "שירותי בית", "Others": "אחר"}
SUB = {"Art & illustration": "איור ואמנות", "Video": "וידאו", "Animation": "אנימציה", "Development": "פיתוח", "Data engineering": "הנדסת נתונים",
       "AI implementation": "הטמעת AI", "Content": "תוכן", "Social media": "רשתות חברתיות", "Campaigns": "קמפיינים", "SEO": "SEO", "Sales": "מכירות",
       "Project management": "ניהול פרויקטים", "Accounting services": "הנהלת חשבונות", "Coaching": "אימון וליווי", "Legal services": "שירותים משפטיים",
       "Plumbing": "אינסטלציה", "Electricity": "חשמל", "Painting": "צביעה", "Carpentry": "נגרות", "Repairs & handyman": "תיקונים והנדימן",
       "Construction": "בנייה ושיפוצים", "Car services": "שירותי רכב", "Gardening": "גינון", "Mobile phone repair": "תיקון סלולר",
       "Home decoration": "סטיילינג ועיצוב הבית", "Music & audio": "הפקה ועריכת סאונד", "Sport & fitness": "ספורט וכושר", "Food & catering": "אוכל וקייטרינג",
       "Transportation (taxi, bus)": "הסעות (מונית, אוטובוס)", "Makeup & hair": "איפור ושיער", "Pets": "חיות מחמד", "Medical services": "שירותים רפואיים"}
CITY = {"Tel Aviv": "תל אביב", "Jerusalem": "ירושלים", "Rishon LeZion": "ראשון לציון", "Haifa": "חיפה", "Be'er Sheva": "באר שבע", "Petah Tikva": "פתח תקווה",
        "Netanya": "נתניה", "Ashdod": "אשדוד", "Holon": "חולון", "Ramat Gan": "רמת גן", "Modi'in": "מודיעין", "Rehovot": "רחובות", "Kfar Saba": "כפר סבא",
        "Herzliya": "הרצליה", "Ra'anana": "רעננה", "Ashkelon": "אשקלון", "Rosh HaAyin": "ראש העין", "Kiryat Shmona": "קריית שמונה", "Sderot": "שדרות"}
REGION = {"Gush Dan": "גוש דן", "Sharon": "השרון", "Jerusalem": "ירושלים והסביבה", "Shfela": "השפלה", "North": "צפון", "South": "דרום"}
FIRST = dict(zip(
 ["Yossi", "Itay", "Omer", "Daniel", "Amit", "Noam", "Eyal", "Tomer", "Lior", "Yonatan", "Ariel", "Nadav", "Ron", "Gal", "Shai", "Ido", "Asaf", "Ofir", "Roee",
  "Elad", "Matan", "Yuval", "Erez", "Guy", "Avi", "Moshe", "Barak", "Alon", "Doron", "Nir", "Uri", "Eitan", "Ben", "Tal", "Oren", "Hagai", "Yair", "Kobi",
  "Rami", "Dor", "Michael", "Aviv", "Shahar", "Ziv", "Amir", "Ohad", "Raz", "Yaniv", "Sagi",
  "Noa", "Maya", "Shira", "Tamar", "Michal", "Yael", "Hila", "Inbal", "Keren", "Adi", "Roni", "Dana", "Liat", "Neta", "Merav", "Sapir", "Efrat", "Rotem",
  "Moran", "Anat", "Galit", "Orly", "Chen", "Osnat", "Lihi"],
 ["יוסי", "איתי", "עומר", "דניאל", "עמית", "נועם", "אייל", "תומר", "ליאור", "יונתן", "אריאל", "נדב", "רון", "גל", "שי", "עידו", "אסף", "אופיר", "רועי",
  "אלעד", "מתן", "יובל", "ארז", "גיא", "אבי", "משה", "ברק", "אלון", "דורון", "ניר", "אורי", "איתן", "בן", "טל", "אורן", "חגי", "יאיר", "קובי",
  "רמי", "דור", "מיכאל", "אביב", "שחר", "זיו", "אמיר", "אוהד", "רז", "יניב", "שגיא",
  "נועה", "מאיה", "שירה", "תמר", "מיכל", "יעל", "הילה", "ענבל", "קרן", "עדי", "רוני", "דנה", "ליאת", "נטע", "מירב", "ספיר", "אפרת", "רותם",
  "מורן", "ענת", "גלית", "אורלי", "חן", "אסנת", "ליהי"]))
LAST = dict(zip(
 ["Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Dahan", "Avraham", "Friedman", "Azulay", "Malka", "Katz", "Shapira", "Ben-David", "Hadad", "Amar", "Gabay",
  "Ohana", "Golan", "Segal", "Rosen", "Navon", "Sasson", "Elbaz", "Weiss", "Shalom", "Barak", "Tzur", "Harel", "Carmi", "Yosef", "Kaplan", "Alon", "Ziv",
  "Nahum", "Levy", "Eliyahu", "Gold", "Sharabi", "Dvir", "Ashkenazi"],
 ["כהן", "לוי", "מזרחי", "פרץ", "ביטון", "דהן", "אברהם", "פרידמן", "אזולאי", "מלכה", "כץ", "שפירא", "בן דוד", "חדד", "עמר", "גבאי",
  "אוחנה", "גולן", "סגל", "רוזן", "נבון", "ששון", "אלבז", "וייס", "שלום", "ברק", "צור", "הראל", "כרמי", "יוסף", "קפלן", "אלון", "זיו",
  "נחום", "לוי", "אליהו", "גולד", "שרעבי", "דביר", "אשכנזי"]))
HEAD = {
 "Illustrator for brands and children's books": "מאיירת למותגים ולספרי ילדים", "Illustrator and visual storyteller": "מאייר ומספר סיפורים חזותי",
 "Video editor for social and brand films": "עורך וידאו לרשתות ולסרטי תדמית", "Videographer and editor": "צלם וידאו ועורך",
 "2D motion designer": "מעצב מושן דו־ממדי", "Motion and explainer animation": "אנימציה וסרטוני הסבר",
 "Full-stack developer (React, Node)": "מפתח Full-stack ‏(React, Node)", "Backend developer, APIs and integrations": "מפתח Backend, ממשקים ואינטגרציות",
 "Web developer for small businesses": "מפתח אתרים לעסקים קטנים", "Data engineer, pipelines and BI": "מהנדס נתונים, תהליכי ETL ו-BI",
 "BI developer and SQL specialist": "מפתח BI ומומחה SQL", "AI automation builder": "בונה אוטומציות AI", "LLM integrations for small teams": "הטמעת מודלי שפה לצוותים קטנים",
 "Copywriter, Hebrew and English": "קופירייטר, עברית ואנגלית", "Content writer for tech and B2B": "כותב תוכן לטכנולוגיה ו-B2B",
 "Social media manager for small businesses": "מנהלת סושיאל לעסקים קטנים", "Instagram and TikTok content manager": "מנהלת תוכן לאינסטגרם וטיקטוק",
 "Performance marketer, Meta and Google": "מנהל קמפיינים, מטא וגוגל", "Paid acquisition specialist": "מומחה לרכישת משתמשים ממומנת",
 "SEO specialist": "מומחה SEO", "Technical SEO and content strategy": "SEO טכני ואסטרטגיית תוכן", "B2B sales consultant": "יועץ מכירות B2B",
 "Sales process and CRM setup": "בניית תהליך מכירה והקמת CRM", "Project manager, ops and tech": "מנהל פרויקטים, תפעול וטכנולוגיה",
 "Operations and project lead": "מוביל תפעול ופרויקטים", "Bookkeeper for freelancers and small businesses": "מנהלת חשבונות לעצמאים ולעסקים קטנים",
 "Bookkeeper and payroll": "הנהלת חשבונות ושכר", "Business coach for the self-employed": "מאמן עסקי לעצמאים",
 "Career coach for reservists returning to work": "מאמן קריירה למילואימניקים שחוזרים לעבודה", "Lawyer, contracts and small business": "עורך דין, חוזים ועסקים קטנים",
 "Labor and commercial law": "דיני עבודה ומשפט מסחרי", "Plumber, repairs and installations": "אינסטלטור, תיקונים והתקנות", "Plumber and leak detection": "אינסטלטור ואיתור נזילות",
 "Licensed electrician": "חשמלאי מוסמך", "Electrician, homes and offices": "חשמלאי לבתים ולמשרדים", "Painter, apartments and offices": "צבעי לדירות ולמשרדים",
 "Painter and plaster work": "צבעי ועבודות שפכטל", "Carpenter, custom furniture": "נגר, רהיטים בהתאמה אישית", "Carpenter and kitchen installer": "נגר ומתקין מטבחים",
 "Handyman, small home repairs": "הנדימן, תיקונים קטנים בבית", "Handyman and furniture assembly": "הנדימן והרכבת רהיטים", "Renovation contractor": "קבלן שיפוצים",
 "Construction and bathroom renovations": "בנייה ושיפוץ חדרי רחצה", "Mobile mechanic": "מכונאי נייד", "Car electrician and diagnostics": "חשמלאי רכב ואבחון תקלות",
 "Gardener and irrigation": "גנן ומערכות השקיה", "Garden design and maintenance": "תכנון ואחזקת גינות", "Phone and tablet repair": "תיקון טלפונים וטאבלטים",
 "Mobile device technician": "טכנאי מכשירים ניידים", "Interior stylist": "סטייליסטית לבית", "Home styling and decor": "סטיילינג ועיצוב לבית",
 "Sound engineer and producer": "טכנאי סאונד ומפיק", "Podcast and voice-over editor": "עורך פודקאסטים וקריינות", "Personal trainer": "מאמן כושר אישי",
 "Functional fitness coach": "מאמן כושר פונקציונלי", "Private chef and small-event catering": "שף פרטי וקייטרינג לאירועים קטנים",
 "Home baker and event desserts": "אופה ביתית וקינוחים לאירועים", "Van and minibus transportation": "הסעות בוואן ובמיניבוס",
 "Driver for groups and airport transfers": "נהג לקבוצות ולהסעות לנתב״ג", "Makeup artist for events": "מאפרת לאירועים", "Hair and makeup for brides": "איפור ושיער לכלות",
 "Dog trainer": "מאלף כלבים", "Dog walker and pet sitter": "דוגווקר ושמרטף לחיות", "Physiotherapist (home visits)": "פיזיותרפיסט (ביקורי בית)",
 "Licensed physiotherapist": "פיזיותרפיסטית מוסמכת"}
SERVICE = {"Custom illustration": "איור בהזמנה אישית", "Short-form video edit": "עריכת סרטון קצר", "60-second explainer animation": "סרטון הסבר מונפש של 60 שניות",
 "Landing page build": "בניית דף נחיתה", "Dashboard setup": "הקמת דשבורד", "AI workflow automation": "אוטומציית תהליך עם AI", "Website copy package": "חבילת תוכן לאתר",
 "Monthly social management": "ניהול סושיאל חודשי", "Campaign setup and launch": "הקמה והשקה של קמפיין", "Technical SEO audit": "בדיקת SEO טכנית",
 "Sales process setup": "בניית תהליך מכירה", "Project management": "ניהול פרויקט", "Monthly bookkeeping": "הנהלת חשבונות חודשית", "Coaching session": "פגישת אימון",
 "Contract review": "בדיקת חוזה", "Leak detection and repair": "איתור ותיקון נזילה", "Panel and outlet work": "עבודות לוח חשמל ושקעים", "Room painting": "צביעת חדר",
 "Custom shelving": "מדפים בהתאמה אישית", "Handyman visit (2 hours)": "ביקור הנדימן (שעתיים)", "Bathroom renovation": "שיפוץ חדר רחצה",
 "Car service at your door": "טיפול לרכב עד הבית", "Garden maintenance visit": "ביקור אחזקת גינה", "Screen replacement": "החלפת מסך",
 "Home styling consultation": "ייעוץ סטיילינג לבית", "Podcast mixing per episode": "מיקס לפרק פודקאסט", "Personal training session": "אימון אישי",
 "Event catering (per guest)": "קייטרינג לאירוע (לסועד)", "Airport transfer": "הסעה לנתב״ג", "Event makeup": "איפור לאירוע", "Training session": "מפגש אילוף",
 "Home physiotherapy session": "טיפול פיזיותרפיה בבית"}
SKILL = {"Illustration": "איור", "Character design": "עיצוב דמויות", "Color grading": "תיקוני צבע", "Motion graphics": "מושן גרפיקס", "Storyboarding": "סטוריבורד",
 "Copywriting": "קופירייטינג", "UX writing": "UX writing", "Hebrew": "עברית", "English": "אנגלית", "Content calendar": "לוח תוכן", "Conversion tracking": "מעקב המרות",
 "Content strategy": "אסטרטגיית תוכן", "Lead generation": "יצירת לידים", "Cold outreach": "פנייה קרה", "Budgeting": "תקציב", "Bookkeeping": "הנהלת חשבונות",
 "VAT reports": "דוחות מע״מ", "Payroll": "שכר", "Business coaching": "אימון עסקי", "Career coaching": "אימון קריירה", "Pricing strategy": "תמחור",
 "Contracts": "חוזים", "Commercial law": "משפט מסחרי", "Labor law": "דיני עבודה", "Leak detection": "איתור נזילות", "Water heaters": "דודי שמש",
 "Drain cleaning": "פתיחת סתימות", "Electrical panels": "לוחות חשמל", "Lighting": "תאורה", "EV chargers": "עמדות טעינה", "Interior painting": "צביעת פנים",
 "Plaster": "שפכטל", "Waterproofing": "איטום", "Custom furniture": "רהיטים בהתאמה", "Kitchens": "מטבחים", "Wood finishing": "גימור עץ",
 "Furniture assembly": "הרכבת רהיטים", "Hanging and mounting": "תלייה והתקנה", "Small repairs": "תיקונים קטנים", "Renovation": "שיפוצים", "Tiling": "ריצוף",
 "Project supervision": "פיקוח", "Diagnostics": "אבחון תקלות", "Brakes": "בלמים", "Batteries": "מצברים", "Irrigation": "השקיה", "Pruning": "גיזום",
 "Garden design": "תכנון גינות", "Screen repair": "תיקון מסכים", "Battery replacement": "החלפת סוללה", "Data recovery": "שחזור מידע",
 "Interior styling": "סטיילינג", "Color consulting": "ייעוץ צבעים", "Space planning": "תכנון חללים", "Mixing": "מיקס", "Mastering": "מאסטרינג",
 "Voice-over": "קריינות", "Strength training": "אימוני כוח", "Functional fitness": "כושר פונקציונלי", "Running": "ריצה", "Catering": "קייטרינג",
 "Kosher": "כשר", "Baking": "אפייה", "Minibus": "מיניבוס", "Airport transfers": "הסעות לנתב״ג", "Group trips": "טיולים קבוצתיים", "Bridal makeup": "איפור כלות",
 "Hair styling": "עיצוב שיער", "Events": "אירועים", "Dog training": "אילוף כלבים", "Pet sitting": "שמרטפות לחיות", "Physiotherapy": "פיזיותרפיה",
 "Sports injuries": "פציעות ספורט", "Rehabilitation": "שיקום"}
BIO = [
 (r"(\d+) years in the field\. Lost most of my regular clients during (\d+) days of reserve duty and rebuilding now\.",
  "{0} שנים בתחום. איבדתי את רוב הלקוחות הקבועים במהלך {1} ימי מילואים, ועכשיו בונה מחדש."),
 (r"Self-employed for (\d+) years\. Reliable, on time, and I answer my phone\. Served (\d+) days since October 7\.",
  "עצמאי כבר {0} שנים. אמין, מגיע בזמן ועונה לטלפון. שירתתי {1} ימים מאז 7 באוקטובר."),
 (r"(\d+) years of experience with private clients and small businesses\. Happy to give a quote the same day\.",
  "{0} שנות ניסיון עם לקוחות פרטיים ועסקים קטנים. נותן הצעת מחיר באותו יום."),
 (r"Freelancer with (\d+) years of experience\. Back from reserve duty and taking new projects\.",
  "פרילנסר עם {0} שנות ניסיון. חזרתי מהמילואים ומקבל פרויקטים חדשים."),
 (r"Working independently for (\d+) years\. Clear pricing, clean work, and references on request\.",
  "עובד עצמאית {0} שנים. מחיר ברור, עבודה נקייה והמלצות לפי בקשה."),
 (r"(\d+) years of experience\. Kept the house running through my partner's (\d+) days of service and now growing my own client list\.",
  "{0} שנות ניסיון. החזקתי את הבית לאורך {1} ימי המילואים של בן הזוג, ועכשיו מגדילה את רשימת הלקוחות שלי."),
 (r"Freelancer with (\d+) years in the field\. My partner served (\d+) days; my projects stalled, and I'm rebuilding them now\.",
  "פרילנסרית עם {0} שנים בתחום. בן הזוג שירת {1} ימים, הפרויקטים שלי נעצרו ואני בונה אותם מחדש."),
]
def bio_he(s):
    for pat, he in BIO:
        m = re.fullmatch(pat, s)
        if m: return he.format(*m.groups())
    raise ValueError(s)

POSTER = {"Lumen Analytics": "לומן אנליטיקס", "Ofek Logistics": "אופק לוגיסטיקה", "Tamar Bakery": "מאפיית תמר", "Nofim Dental Clinic": "מרפאת השיניים נופים",
 "Shaked Realty": "שקד נדל״ן", "Gefen Coffee Roasters": "גפן בית קלייה", "Arava Solar": "ערבה סולאר", "Hadar Fitness Studio": "סטודיו הדר לכושר",
 "Pardes Events": "פרדס אירועים", "Yarok Community Association": "עמותת ירוק לקהילה", "Brightpath Software (HR)": "ברייטפאת׳ תוכנה (HR)",
 "Kinneret Boutique Hotel": "מלון בוטיק כנרת", "Negev Families Fund": "קרן משפחות הנגב", "Orion Cyber (HR)": "אוריון סייבר (HR)",
 "Shalev Law Office": "משרד עו״ד שלו", "Mishol Kindergartens": "גני משעול", "Avi Mor": "אבי מור", "Michal Rubin": "מיכל רובין", "Eli Gross": "אלי גרוס",
 "Ruth Amsalem": "רות אמסלם", "Dvora Klein": "דבורה קליין", "Assaf Tal": "אסף טל", "Sigal Ben-Ami": "סיגל בן עמי", "Yaron Peleg": "ירון פלג",
 "Hagit Levin": "הגית לוין", "Zohar Media": "זוהר מדיה", "Tirosh Winery": "יקב תירוש", "Galil Tech Hub": "מרכז החדשנות גליל"}
PTYPE = {"Business": "עסק", "HR or recruiter": "משאבי אנוש / גיוס", "Public body or non-profit": "גוף ציבורי / עמותה", "Private person": "אדם פרטי"}
TIMELINE = {"ASAP": "מיידי", "Within a week": "תוך שבוע", "Within a month": "תוך חודש", "Flexible": "גמיש"}
JOB = {
 "Landing page for a new SaaS product": ("דף נחיתה למוצר SaaS חדש", "אנחנו משיקים מוצר אנליטיקה ל-B2B וצריכים דף נחיתה מהיר ורספונסיבי ב-Next.js, עם טופס הרשמה שמחובר ל-HubSpot. התוכן והעיצוב מוכנים."),
 "Fix checkout bugs in our WooCommerce store": ("תיקון תקלות בקופה של חנות WooCommerce", "לקוחות מדווחים על תשלומים שנכשלים במובייל. צריך לאתר את התקלה בתהליך התשלום ובתוסף הסליקה, ולבדוק ב-iOS ובאנדרואיד."),
 "Backend developer for a 3-month contract": ("מפתח Backend לחוזה של 3 חודשים", "Node.js ו-PostgreSQL. בניית ממשקים פנימיים למערכת השיבוץ שלנו. יומיים בשבוע במשרד באשדוד, השאר מהבית."),
 "Automate lead intake with an AI assistant": ("אוטומציה לקליטת לידים עם עוזר AI", "לידים מגיעים מוואטסאפ, מהאתר ומפייסבוק. רוצים שיסוכמו, ידורגו ויוזנו ל-CRM באופן אוטומטי."),
 "Chatbot for our clinic's appointment questions": ("צ׳טבוט לשאלות על תורים במרפאה", "עוזר פשוט שעונה בעברית על שעות פתיחה, מחירים וקביעת תורים, באתר ובוואטסאפ."),
 "Sales dashboard in Looker Studio": ("דשבורד מכירות ב-Looker Studio", "חיבור הייצוא מ-Priority ונתוני Google Ads לדשבורד מכירות שבועי אחד להנהלה."),
 "Data analyst for donor reporting": ("אנליסט נתונים לדיווח תורמים", "ניקוי וניתוח של שלוש שנים של נתוני תורמים, ובניית תבנית דוח רבעוני לוועד המנהל."),
 "Website copy in Hebrew and English": ("תוכן לאתר בעברית ובאנגלית", "כתיבה מחדש של 6 עמודים באתר המלון בשתי השפות. טון חם ואישי. אנחנו מספקים תמונות ופרטי חדרים."),
 "Blog posts on cybersecurity for SMBs": ("פוסטים לבלוג על סייבר לעסקים קטנים", "ארבעה פוסטים של 1,200 מילה בחודש באנגלית, לבעלי עסקים קטנים. הבדיקה הטכנית אצלנו."),
 "Instagram management for a bakery": ("ניהול אינסטגרם למאפייה", "3 פוסטים ו-5 סטוריז בשבוע, כולל צילום במאפייה פעם בשבוע. עדיפות למישהו מירושלים."),
 "TikTok content for a fitness studio": ("תוכן לטיקטוק לסטודיו כושר", "8 סרטונים קצרים בחודש מהשיעורים שלנו, ערוכים ומפורסמים עם כיתוב. קהל יעד: נשים בגילאי 25–45 במודיעין."),
 "Google Ads for a dental clinic": ("Google Ads למרפאת שיניים", "הקמה וניהול של קמפיינים בחיפוש להשתלות ולהלבנה. תקציב חודשי ₪8,000. מעקב המרות על שיחות וטפסים."),
 "Meta lead campaign for solar installations": ("קמפיין לידים במטא להתקנות סולאריות", "קמפיין לידים לבעלי בתים בדרום. צריך וריאציות קריאייטיב, טופס לידים וסנכרון ל-CRM."),
 "Fundraising campaign for families in the Negev": ("קמפיין גיוס כספים למשפחות בנגב", "קמפיין דיגיטלי לקראת החגים: דף נחיתה, מודעות במטא וערכת שיתוף לוואטסאפ."),
 "SEO audit for a real estate website": ("בדיקת SEO לאתר נדל״ן", "בדיקה טכנית ותוכנית תוכן לשלושה חודשים לעמודי שכונות בהרצליה וברעננה."),
 "Illustrations for a children's book": ("איורים לספר ילדים", "12 איורים בעמוד מלא לספר תמונות בעברית על כלב שהבעלים שלו במילואים."),
 "Wine label illustration": ("איור לתווית יין", "תווית מאוירת ביד לרוזה החדש שלנו. סגנון בוטני, שני סבבי תיקונים."),
 "Event video for a corporate family day": ("וידאו לאירוע יום משפחות של חברה", "צילום ועריכה של סרטון סיכום בן 3 דקות ועוד 5 רילס מיום המשפחות בראשון לציון."),
 "Short testimonial videos for a recruiting campaign": ("סרטוני המלצה קצרים לקמפיין גיוס", "ראיונות עם 6 עובדים ועריכה של 6 סרטונים בני דקה ללינקדאין. המשרד בפתח תקווה."),
 "60-second explainer for a community program": ("סרטון הסבר של 60 שניות לתוכנית קהילתית", "סרטון מונפש על תוכנית התמיכה החדשה שלנו למשפחות מילואימניקים. התסריט מוכן."),
 "Set up a sales pipeline in HubSpot": ("הקמת משפך מכירות ב-HubSpot", "הגדרת שלבים, בניית רצפי מיילים והדרכה לשני אנשי מכירות. כ-5 ימי עבודה."),
 "Project manager for an office move": ("מנהל פרויקט למעבר משרדים", "תיאום קבלנים, IT ולוגיסטיקה למעבר של משרד עם 60 עובדים בנובמבר."),
 "Monthly bookkeeping for a small studio": ("הנהלת חשבונות חודשית לסטודיו קטן", "הנהלת חשבונות, דוחות מע״מ והכנה לדוח שנתי לסטודיו כושר עם 3 עובדים."),
 "Bookkeeper for a non-profit": ("מנהל/ת חשבונות לעמותה", "הנהלת חשבונות חודשית וקבלות לתורמים (סעיף 46). כ-80 תנועות בחודש."),
 "Career coaching workshop for returning reservists": ("סדנת קריירה למילואימניקים שחוזרים לעבודה", "שתי סדנאות של 3 שעות ל-20 מילואימניקים שחוזרים לשוק העבודה. במרכז החדשנות בקריית שמונה."),
 "Review a supplier agreement": ("בדיקת הסכם ספק", "הסכם אספקה של 14 עמודים עם מפיץ אירופי. צריך בדיקה והערות באנגלית."),
 "Employment contracts template": ("תבנית חוזי העסקה", "תבנית חוזה העסקה ו-NDA סטנדרטיים לצוות פיתוח שגדל."),
 "Leaking water heater in the bathroom": ("דוד שמש דולף לחדר הרחצה", "הדוד דולף לתקרה של חדר הרחצה. צריך מישהו השבוע בראשון לציון."),
 "Replace kitchen faucet and drain": ("החלפת ברז וסיפון במטבח", "הברז החדש כבר נקנה. צריך גם להחליף את הסיפון מתחת לכיור."),
 "Plumber for a small restaurant kitchen": ("אינסטלטור למטבח של מסעדה קטנה", "ניקוי מפריד שומן והתקנת שני כיורים לפני הפתיחה."),
 "Install an EV charger at home": ("התקנת עמדת טעינה לרכב חשמלי", "בית פרטי בכפר סבא. הלוח במרחק כ-15 מטר מהחניה. העמדה כבר נקנתה."),
 "Lighting for a new bakery branch": ("תאורה לסניף חדש של המאפייה", "תאורת פסים ו-12 שקעים חדשים בחנות של 60 מ״ר. יש תוכניות."),
 "Electrician for a kindergarten safety check": ("חשמלאי לבדיקת בטיחות בגנים", "בדיקת בטיחות שנתית ותיקונים בשלושה גני ילדים ברחובות."),
 "Paint a 4-room apartment before move-in": ("צביעת דירת 4 חדרים לפני כניסה", "כ-110 מ״ר קירות, לבן, ותיקון של שני סדקים. רמת גן."),
 "Repaint hotel corridors": ("צביעה מחדש של מסדרונות המלון", "מסדרונות בשלוש קומות, עבודה רק בין 10:00 ל-16:00."),
 "Custom bookshelf for a living room wall": ("ספרייה בהתאמה לקיר בסלון", "קיר ברוחב 3.2 מ׳, מהרצפה עד התקרה, פורניר אלון. נתניה."),
 "Assemble IKEA furniture and hang shelves": ("הרכבת רהיטי איקאה ותליית מדפים", "ארון, שתי מיטות וארבעה מדפים. חולון, קומה שלישית עם מעלית."),
 "Handyman for monthly office maintenance": ("הנדימן לאחזקה חודשית במשרד", "4 שעות בחודש של תיקונים קטנים במשרד בתל אביב."),
 "Bathroom renovation": ("שיפוץ חדר רחצה", "שיפוץ מלא של חדר רחצה בגודל 5 מ״ר כולל ריצוף ומקלחון חדש. ירושלים."),
 "Battery and brake check at the office lot": ("בדיקת מצברים ובלמים בחניון המשרד", "בדיקה רבעונית ל-6 רכבי חברה באתר שלנו באשדוד."),
 "Garden maintenance every two weeks": ("אחזקת גינה פעם בשבועיים", "גינה פרטית של כ-80 מ״ר ותיקון טפטפות. רעננה."),
 "Garden for a community center": ("גינה למרכז קהילתי", "שתילה והקמת השקיה לגינה קהילתית של 200 מ״ר בשדרות."),
 "Replace screens on 5 company phones": ("החלפת מסכים ל-5 טלפונים של החברה", "חמישה מסכים ל-iPhone 13. איסוף והחזרה למשרד בתל אביב."),
 "Style a model apartment for sale": ("סטיילינג לדירה לדוגמה", "יומיים של סטיילינג לדירת 4 חדרים בהרצליה, לצילומים ולבית פתוח."),
 "Edit and mix a weekly podcast": ("עריכה ומיקס לפודקאסט שבועי", "פרקים של 45 דקות בעברית, 4 בחודש. ניקוי רעשים, פתיח וסגיר."),
 "Personal trainer for twice-weekly sessions": ("מאמן אישי פעמיים בשבוע", "אימונים בבית בחיפה, בשעות הבוקר. דגש על חיזוק הגב."),
 "Catering for a 40-person team lunch": ("קייטרינג לארוחת צוות של 40 איש", "חלבי וכשר, במשרד בתל אביב. צריך גם אפשרויות צמחוניות."),
 "Minibus for a wedding weekend": ("מיניבוס לסוף שבוע של חתונה", "שתי נסיעות הלוך־חזור בין באר שבע לאולם, 18 נוסעים."),
 "Bridal makeup and hair": ("איפור ושיער לכלה", "כלה, אמא ושתי אחיות, בבוקר החתונה באשקלון."),
 "Home physiotherapy after knee surgery": ("פיזיותרפיה בבית אחרי ניתוח ברך", "שני טיפולים בשבוע במשך שישה שבועות בירושלים. פיזיותרפיסט מוסמך בלבד."),
}
COMMENT = {"Arrived on time and did clean work. Will hire again.": "הגיע בזמן ועשה עבודה נקייה. אזמין שוב.",
 "Professional and fast. Explained everything clearly.": "מקצועי ומהיר. הסביר הכול בצורה ברורה.", "Great communication from start to finish.": "תקשורת מצוינת מההתחלה ועד הסוף.",
 "Fair price and excellent result.": "מחיר הוגן ותוצאה מעולה.", "Very reliable. Recommended to friends already.": "אמין מאוד. כבר המלצתי לחברים.",
 "Understood the brief immediately and delivered early.": "הבין את הבריף מיד ומסר לפני הזמן.", "Patient, precise and easy to work with.": "סבלני, מדויק ונעים לעבוד איתו.",
 "Solid work, small delay but kept us updated.": "עבודה טובה, עיכוב קטן אבל עדכן אותנו כל הזמן.", "Good result, took longer than planned.": "תוצאה טובה, לקח יותר זמן מהמתוכנן.",
 "Work was fine, communication could be better.": "העבודה הייתה בסדר, התקשורת יכלה להיות טובה יותר.", "": ""}
NOREASON = {"The other side didn't respond": "הצד השני לא הגיב", "Price": "מחיר", "Availability": "זמינות", "Not a fit": "לא מתאים"}
REJ = {"Unreadable file": "קובץ לא קריא", "Name mismatch": "השם לא תואם", "Under 30 days on first submission": "פחות מ-30 יום בהגשה הראשונה"}

jt = {j["title"]: JOB[j["title"]][0] for j in D["jobs"]}
def note_he(n):
    if n.startswith("Applied to "): return "הגשה למשרה: " + jt[n[len("Applied to "):]]
    if n.startswith("Approved direct request from "): return "אישור פנייה ישירה מ" + POSTER[n[len("Approved direct request from "):]]
    m = re.fullmatch(r"Bought (\d+)-credit bundle", n)
    if m: return f"רכישת חבילת {m.group(1)} קרדיטים"
    return {"Welcome credits on verification": "קרדיטי הצטרפות באישור האימות", "Beta support grant (ops)": "מענק תמיכה בבטא (צוות)",
            "Goodwill grant: feedback champion": "מענק הוקרה: מצטיין משובים", "Job ended without a hire": "המשרה נסגרה ללא גיוס",
            "Unopened for 30 days": "לא נפתחה 30 יום"}[n]

for p in D["providers"]:
    p["first"], p["last"] = FIRST[p["first"]], LAST[p["last"]]
    p["city"], p["region"] = CITY[p["city"]], REGION[p["region"]]
    p["category"] = CAT[p["category"]]; p["subs"] = [SUB[s] for s in p["subs"]]
    p["skills"] = [SKILL.get(s, s) for s in p["skills"]]
    p["headline"] = HEAD[p["headline"]]; p["bio"] = bio_he(p["bio"])
    for s in p["services"]: s["title"], s["sub"] = SERVICE[s["title"]], SUB[s["sub"]]
    for r in p["reviews"]: r["comment"], r["by"] = COMMENT[r["comment"]], POSTER[r["by"]]
    if p.get("rejected_first"): p["rejected_first"] = REJ[p["rejected_first"]]
for c in D["posters"]:
    c["name"], c["type"], c["city"] = POSTER[c["name"]], PTYPE[c["type"]], CITY[c["city"]]
for j in D["jobs"]:
    j["title"], j["desc"] = JOB[j["title"]]
    j["sub"], j["category"], j["city"], j["region"] = SUB[j["sub"]], CAT[j["category"]], CITY[j["city"]], REGION[j["region"]]
    j["timeline"] = TIMELINE[j["timeline"]]
for q in D["requests"]: q["sub"], q["brief"] = SUB[q["sub"]], SERVICE[q["brief"]]
for e in D["engagements"]: e["title"] = jt.get(e["title"]) or SERVICE[e["title"]]
for r in D["reviews"]:
    if "comment" in r: r["comment"] = COMMENT[r["comment"]]
    if "no_reason" in r: r["no_reason"] = NOREASON[r["no_reason"]]
for x in D["ledger"]:
    x["note"] = note_he(x["note"])
    if x["ref_type"] == "bundle": x["ref"] = x["ref"].replace("-credit bundle", " קרדיטים")
D["taxonomy"] = {CAT[k]: [SUB[s] for s in v] for k, v in D["taxonomy"].items()}
D["budget_mandatory"] = [CAT[c] for c in D["budget_mandatory"]]

json.dump(D, open("out/joby_demo_data_he.json", "w"), ensure_ascii=False, separators=(",", ":"))

def wcsv(name, rows, cols, heads):
    with open(f"out/{name}", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(heads)
        for r in rows: w.writerow([("; ".join(map(str, r.get(c))) if isinstance(r.get(c), list) else r.get(c)) for c in cols])
TYPE = {"reservist": "מילואימניק", "spouse": "בן/בת זוג", "verified": "מאומת", "pending": "ממתין לאימות"}
prow = [dict(p, type_he=TYPE[p["type"]], status_he=TYPE[p["status"]]) for p in D["providers"]]
wcsv("joby_providers.csv", prow,
     ["id", "first", "last", "type_he", "status_he", "city", "region", "category", "subs", "headline", "skills", "years", "days_band", "remote", "onsite",
      "radius", "signup", "verified_at", "balance", "rating", "review_count", "jobs_done", "partner_id", "license"],
     ["מזהה", "שם פרטי", "שם משפחה", "סוג", "סטטוס", "עיר", "אזור", "קטגוריה", "תתי־קטגוריות", "כותרת", "מיומנויות", "שנות ניסיון", "ימי מילואים",
      "מרחוק", "בשטח", "רדיוס (ק״מ)", "הרשמה", "אומת בתאריך", "יתרת קרדיטים", "דירוג", "מספר ביקורות", "עבודות שבוצעו", "מזהה בן/בת זוג", "מס׳ רישיון"])
C = {c["id"]: c for c in D["posters"]}
JS = {"open": "פתוחה", "hired": "גויס", "closed": "נסגרה ללא גיוס", "expired": "פג תוקף"}
MODE = {"remote": "מרחוק", "on-site": "בשטח", "both": "שניהם"}
jrows = [dict(j, poster_name=C[j["poster"]]["name"], status_he=JS[j["status"]], mode_he=MODE[j["mode"]],
              btype=({"fixed": "סכום קבוע", "hourly": "לפי שעה"}[j["budget"]["type"]] if j["budget"] else "פתוח להצעות"),
              bmin=(j["budget"] or {}).get("min"), bmax=(j["budget"] or {}).get("max")) for j in D["jobs"]]
wcsv("joby_jobs.csv", jrows, ["id", "title", "category", "sub", "mode_he", "city", "poster", "poster_name", "btype", "bmin", "bmax", "timeline", "posted", "status_he", "applicants", "closed_at"],
     ["מזהה", "כותרת", "קטגוריה", "תת־קטגוריה", "אופן עבודה", "עיר", "מזהה מפרסם", "מפרסם", "סוג תקציב", "תקציב מינימום", "תקציב מקסימום", "לוח זמנים", "פורסם", "סטטוס", "מגישים", "נסגרה"])
LT = {"welcome": "הצטרפות", "apply": "הגשה", "request": "פנייה ישירה", "credit_back": "החזר", "purchase": "רכישה", "admin_grant": "מענק צוות"}
lrows = [dict(x, type_he=LT[x["type"]]) for x in D["ledger"]]
wcsv("joby_credit_ledger.csv", lrows, ["id", "at", "provider", "type_he", "amount", "balance_after", "ref", "note", "nis"],
     ["מזהה", "מועד", "ספק", "סוג", "קרדיטים", "יתרה אחרי", "הפניה", "פירוט", "סכום ₪"])
print("ok", len(D["providers"]), len(D["jobs"]))
