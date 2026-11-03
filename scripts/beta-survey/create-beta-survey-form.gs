/**
 * Joby — beta tester survey (Google Form). Founder, 2026-11-03.
 *
 * Creates the form in your Google Drive and prints its link.
 *   1. Open https://script.google.com → "New project".
 *   2. Delete what is there, paste this whole file, click Save.
 *   3. Choose the function "createBetaSurvey" and click Run. Allow access when Google asks
 *      (it is your own script, creating a form in your own Drive).
 *   4. Open "Execution log": it shows the link to send (forms.gle/…) and the edit link.
 *
 * The app emails this link 3 days after sign-up, once the link is saved in the setting
 * beta_survey_url (see README → "Beta survey").
 */
function createBetaSurvey() {
  var form = FormApp.create('Joby — שאלון לבודקי הבטא');
  form.setDescription(
    'תודה שאת/ה מהראשונים שמנסים את Joby, המרקטפלייס של המילואים!\n' +
    'השאלון לוקח כ-4 דקות. אין תשובות נכונות — נשמח לשמוע בכנות מה עבד, מה הפריע ומה חסר.\n' +
    'שאלות שמסומנות בכוכבית הן חובה; כל השאר לא חובה.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setConfirmationMessage('תודה רבה! כל תשובה נקראת על ידי הצוות. אם השארת פרטים לשיחה — נחזור אליך בקרוב. 🙏');

  var scale = function (title, help, low, high, required) {
    var item = form.addScaleItem().setTitle(title).setBounds(1, 5).setLabels(low || 'בכלל לא', high || 'מאוד');
    if (help) item.setHelpText(help);
    return item.setRequired(required !== false);
  };
  var choice = function (title, options, required, other) {
    var item = form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options);
    if (other) item.showOtherOption(true);
    return item.setRequired(!!required);
  };
  var checks = function (title, options, other) {
    var item = form.addCheckboxItem().setTitle(title).setChoiceValues(options);
    if (other) item.showOtherOption(true);
    return item;
  };
  var text = function (title, help) {
    var item = form.addParagraphTextItem().setTitle(title);
    if (help) item.setHelpText(help);
    return item;
  };
  var section = function (title, help) {
    var item = form.addPageBreakItem().setTitle(title);
    if (help) item.setHelpText(help);
    return item;
  };

  // 1. About you (first page)
  form.addSectionHeaderItem().setTitle('קצת עליך');
  choice('איך את/ה משתמש/ת ב-Joby?', [
    'מציע/ה שירותים — מילואימניק/ית',
    'מציע/ה שירותים — בן/בת זוג של מילואימניק',
    'מפרסם/ת עבודות או מחפש/ת נותני שירות',
    'גם וגם',
    'עוד לא החלטתי / רק הסתכלתי',
  ], true);
  checks('מאיפה נכנסת בעיקר?', ['טלפון נייד', 'מחשב', 'טאבלט']);
  choice('איך שמעת על Joby?', ['חבר/ה או המלצה', 'קבוצת WhatsApp', 'רשת חברתית', 'מהיחידה / מהמילואים', 'מייל'], false, true);

  // 2. Sign-up and getting started
  section('הרשמה והתחלה', 'מהכניסה הראשונה ועד שהחשבון היה מוכן.');
  scale('כמה קל היה להירשם ולהתחיל?', null, 'קשה מאוד', 'קל מאוד');
  checks('איזה שלב היה מסובך או מתסכל? (אפשר כמה)', [
    'קוד ב-SMS',
    'קוד האימות במייל',
    'הכניסה עם Google',
    'העלאת טופס 3010 (אישור שירות מילואים)',
    'המתנה לאישור האימות',
    'מילוי הפרופיל (תחומים, אזור, שירותים)',
    'פרטי המפרסם (סוג, עיר, ארגון)',
    'שום דבר — הכול היה פשוט',
  ], true);
  text('משהו שהיית משנה בתהליך ההרשמה?');

  // 3. Navigation
  section('ניווט ומבנה', 'התפריט, המעבר בין מסכים והמעבר בין "עובד/ת" ל"מגייס/ת".');
  scale('כמה קל היה למצוא את מה שחיפשת?', null, 'קשה מאוד', 'קל מאוד');
  scale('עד כמה התפריט ושמות המסכים ברורים? (בית, הזדמנויות, הצעות, התראות, פרופיל, חשבון)', null, 'לא ברורים', 'ברורים מאוד');
  choice('המתג "עובד/ת – מגייס/ת" בראש המסך:', ['ברור ושימושי', 'לא הבנתי מה הוא עושה', 'לא שמתי לב אליו', 'לא רלוונטי לי']);
  text('היה מקום שבו הלכת לאיבוד או לא ידעת מה לעשות עכשיו? איפה?');

  // 4. Ease of use and speed
  section('קלות שימוש ומהירות');
  scale('באופן כללי, כמה Joby קל לשימוש?', null, 'קשה מאוד', 'קל מאוד');
  choice('איך המהירות של האפליקציה?', ['מהירה', 'לפעמים איטית', 'איטית ברוב הזמן'], true);
  scale('איך האפליקציה נראית ומרגישה בטלפון?', 'אם לא נכנסת מהטלפון — אפשר לדלג.', 'לא נוח', 'מצוין', false);
  choice('נתקלת בתקלה, שגיאה או משהו שלא עבד?', ['לא', 'כן'], true);
  text('אם כן — מה קרה ובאיזה מסך?', 'כמה שיותר פרטים יעזרו: מה ניסית לעשות, מה ראית, טלפון או מחשב.');

  // 5. Experience and content
  section('חוויה ותוכן', 'הטקסטים, ההסברים והאמון.');
  scale('עד כמה הטקסטים וההסברים ברורים?', null, 'לא ברורים', 'ברורים מאוד');
  scale('עד כמה התג "מאומת" והדירוגים גורמים לך לסמוך על הצד השני?', null, 'בכלל לא', 'מאוד');
  choice('היה ברור לך ש-Joby חינמי לגמרי כרגע, וש"הקרדיטים" רק מראים איך זה יעבוד בעתיד?', ['כן', 'חלקית', 'לא', 'לא שמתי לב לקרדיטים']);
  scale('עד כמה ההתראות והמיילים מ-Joby שימושיים?', null, 'מיותרים', 'מאוד שימושיים', false);

  // 6. Value
  section('האם Joby עוזר לך?');
  scale('למציעי שירותים: עד כמה העבודות שראית מתאימות לך (תחום ואזור)?', 'אם את/ה לא מציע/ה שירותים — אפשר לדלג.', 'לא מתאימות', 'מתאימות מאוד', false);
  scale('למפרסמים: עד כמה מצאת נותני שירות שמתאימים לך?', 'אם לא פרסמת או חיפשת — אפשר לדלג.', 'בכלל לא', 'מאוד', false);
  checks('מה כבר עשית ב-Joby? (אפשר כמה)', [
    'השלמתי פרופיל',
    'הגשתי מועמדות לעבודה',
    'קיבלתי או אישרתי פנייה ישירה',
    'פרסמתי עבודה',
    'פניתי ישירות לנותן שירות',
    'גייסתי מישהו / נבחרתי לעבודה',
    'השארתי משוב אחרי עבודה',
    'עוד כלום',
  ]);
  text('מה הכי חסר לך ב-Joby כרגע?');

  // 7. Summary
  section('לסיום');
  form.addScaleItem().setTitle('עד כמה סביר שתמליץ/י על Joby לחבר או לחברה?').setBounds(0, 10)
    .setLabels('בכלל לא סביר', 'סביר מאוד').setRequired(true);
  text('דבר אחד שהיית משפר/ת קודם כול:');
  text('עוד משהו שחשוב לך שנדע?');
  choice('נשמח לשיחה קצרה (15 דקות) עם הצוות. מתאים לך?', ['כן', 'לא, תודה']);
  form.addTextItem().setTitle('אם כן — שם וטלפון או מייל ליצירת קשר')
    .setHelpText('לא חובה. הפרטים משמשים רק ליצירת קשר לגבי השאלון.');

  // A sheet for the answers, next to the form.
  var sheet = SpreadsheetApp.create('Joby — תשובות לשאלון הבטא');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Link to send (put this in beta_survey_url): ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Answers sheet: ' + sheet.getUrl());
}
