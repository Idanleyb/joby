"""Build the Joby demo dataset for the real database from the POC data.

Input : out/joby_demo_data.json and out/joby_demo_data_he.json (run gen_data.py, then localize.py)
Output: supabase/demo/load_demo.sql (rows per table as JSON, timestamps in UTC; paste into the Supabase SQL Editor)

Everything is tagged as demo (profiles.is_demo, provider/poster profiles, jobs).
The loader shifts every timestamp so that the POC "today" (25 Oct 2026, 18:00)
becomes the moment the data is loaded.

On top of the POC data it adds a few scripted scenarios for the four sign-in
("hero") demo accounts, so every screen and flow can be shown live.
"""
import datetime as dt
import json
import os
import random
import sys
import uuid
from zoneinfo import ZoneInfo

SRC = sys.argv[1] if len(sys.argv) > 1 else "out"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(REPO, "supabase", "demo")

E = json.load(open(os.path.join(SRC, "joby_demo_data.json")))
H = json.load(open(os.path.join(SRC, "joby_demo_data_he.json")))
R = random.Random(2810)
IL = ZoneInfo("Asia/Jerusalem")
NS = uuid.UUID("6f2c1a52-8f0e-4c7e-9a51-3a1d0c0d2e10")
TODAY = dt.datetime(2026, 10, 25, 18, 0, tzinfo=IL)


def uid(*parts):
    return str(uuid.uuid5(NS, "/".join(map(str, parts))))


def t(s):
    """POC local time string → aware datetime."""
    return dt.datetime.fromisoformat(s).replace(tzinfo=IL) if isinstance(s, str) else s


def iso(d):
    return None if d is None else d.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ago(days=0, hours=0):
    return TODAY - dt.timedelta(days=days, hours=hours)


# ---------------------------------------------------------------- reference maps
SLUG = {"Art & illustration": "art-illustration", "Video": "video", "Animation": "animation", "Development": "development",
        "Data engineering": "data-engineering", "AI implementation": "ai-implementation", "Content": "content", "Social media": "social-media",
        "Campaigns": "campaigns", "SEO": "seo", "Sales": "sales", "Project management": "project-management",
        "Accounting services": "accounting", "Coaching": "coaching", "Legal services": "legal-services", "Plumbing": "plumbing",
        "Electricity": "electricity", "Painting": "painting", "Carpentry": "carpentry", "Repairs & handyman": "repairs-handyman",
        "Construction": "construction", "Car services": "car-services", "Gardening": "gardening", "Mobile phone repair": "mobile-repair",
        "Home decoration": "home-decoration", "Music & audio": "music-audio", "Sport & fitness": "sport-fitness",
        "Food & catering": "food-catering", "Transportation (taxi, bus)": "transportation", "Makeup & hair": "makeup-hair",
        "Pets": "pets", "Medical services": "medical-services"}
CATEGORY = {s: c for c, subs in E["taxonomy"].items() for s in subs}
BUDGET_MANDATORY = set(E["budget_mandatory"])
# Town names exactly as in il_cities.
CITY = {"Tel Aviv": "תל אביב-יפו", "Jerusalem": "ירושלים", "Rishon LeZion": "ראשון לציון", "Haifa": "חיפה", "Be'er Sheva": "באר שבע",
        "Petah Tikva": "פתח תקווה", "Netanya": "נתניה", "Ashdod": "אשדוד", "Holon": "חולון", "Ramat Gan": "רמת גן",
        "Modi'in": "מודיעין-מכבים-רעות", "Rehovot": "רחובות", "Kfar Saba": "כפר סבא", "Herzliya": "הרצליה", "Ra'anana": "רעננה",
        "Ashkelon": "אשקלון", "Rosh HaAyin": "ראש העין", "Kiryat Shmona": "קריית שמונה", "Sderot": "שדרות"}
PTYPE = {"Business": "business", "HR or recruiter": "hr", "Public body or non-profit": "public_body", "Private person": "private"}
TIMELINE = {"ASAP": "asap", "Within a week": "week", "Within a month": "month", "Flexible": "flexible"}
MODE = {"on-site": "onsite", "remote": "remote", "both": "both"}
BAND = {"30–59": "30-59", "60–119": "60-119", "120+": "120+"}
NO_REASON = {"The other side didn't respond": "no_response", "Price": "price", "Availability": "availability", "Not a fit": "not_a_fit"}
JOB_STATUS = {"open": "open", "hired": "hired", "closed": "closed_no_hire", "expired": "expired"}
TECH = {"Programming & Tech", "Digital Marketing", "Business", "Finance", "Lawyers", "Design", "Consulting", "Music & Audio"}

# The four sign-in demo accounts (register these numbers as Supabase test numbers, code 123456).
HERO_PHONE = {"P001": "972500000101", "P081": "972500000102", "C17": "972500000103", "C01": "972500000104"}
HERO_NAME = {"C01": "שירה לוין", "C17": "אבי מור"}

HP = {p["id"]: p for p in H["providers"]}
HC = {c["id"]: c for c in H["posters"]}
HJ = {j["id"]: j for j in H["jobs"]}
P = {p["id"]: p for p in E["providers"]}
C = {c["id"]: c for c in E["posters"]}
J = {j["id"]: j for j in E["jobs"]}

out = {k: [] for k in ["users", "poster_profiles", "provider_profiles", "provider_subcategories", "provider_skills", "service_cards",
                       "verification_requests", "spouse_links", "jobs", "applications", "direct_requests", "engagements",
                       "feedback_requests", "feedback", "credit_transactions", "extra_hire_requests", "job_saves", "notifications"]}
ID = {}  # POC id → uuid


def short(first, last):
    return f"{first} {last[0]}."


# ---------------------------------------------------------------- people
for c in E["posters"]:
    h = HC[c["id"]]
    ID[c["id"]] = uid("user", c["id"])
    private = c["type"] == "Private person"
    full = h["name"] if private else HERO_NAME.get(c["id"], f"צוות {h['name']}")
    since = t(c["since"])
    out["users"].append({"id": ID[c["id"]], "phone": HERO_PHONE.get(c["id"]), "email": f"demo-{c['id'].lower()}@demo.joby.invalid",
                         "phone_confirmed_at": iso(since) if c["id"] in HERO_PHONE else None, "meta": {"full_name": full, "demo": True},
                         "created_at": iso(since), "full_name": full, "is_provider": False, "is_poster": True})
    first, *rest = h["name"].split(" ")
    out["poster_profiles"].append({
        "user_id": ID[c["id"]], "display_name": short(first, rest[-1]) if private and rest else h["name"],
        "poster_type": PTYPE[c["type"]], "company_name": None if private else h["name"], "city": CITY[c["city"]],
        "about": None if private else {
            "business": f"{h['name']} — עסק מ{CITY[c['city']]}. עובדים עם מילואימניקים ובני זוגם ומחפשים אנשי מקצוע אמינים.",
            "hr": f"צוות הגיוס של {h['name']}. מגייסים פרילנסרים ועובדים לפרויקטים ולמשרות.",
            "public_body": f"{h['name']} — גוף ציבורי/עמותה. תומכים בקהילה ובמשפחות המילואים.",
        }[PTYPE[c["type"]]] + " (נתוני דמו)",
        "website": None, "created_at": iso(since), "is_demo": True})

partner_of = {}
for p in E["providers"]:
    h = HP[p["id"]]
    ID[p["id"]] = uid("user", p["id"])
    if p.get("partner_id"):
        partner_of[p["id"]] = p["partner_id"]
    signup = t(p["signup"])
    verified = p["status"] == "verified"
    hero = p["id"] in HERO_PHONE
    full = f"{h['first']} {h['last']}"
    out["users"].append({"id": ID[p["id"]], "phone": HERO_PHONE.get(p["id"]), "email": f"demo-{p['id'].lower()}@demo.joby.invalid",
                         "phone_confirmed_at": iso(signup) if hero else None, "meta": {"full_name": full, "demo": True},
                         "created_at": iso(signup), "full_name": full, "is_provider": True, "is_poster": False})
    radius = p["radius"]
    if p["id"] == "P001":
        radius = 25  # so distance matching can be shown
    busy = (not hero) and R.random() < 0.12
    lic = p["license"] if p["subs"][0] in ("Legal services", "Medical services") else None
    out["provider_profiles"].append({
        "user_id": ID[p["id"]], "provider_type": p["type"], "verification_status": "approved" if verified else "pending",
        "verified_at": iso(t(p["verified_at"])) if verified else None, "display_name": short(h["first"], h["last"]),
        "headline": h["headline"][:70], "bio": h["bio"], "city": CITY[p["city"]],
        "radius_km": radius if radius in (10, 25, 50) else None, "works_onsite": p["onsite"], "works_remote": p["remote"],
        "years_experience": p["years"], "languages": ["עברית", "אנגלית"] if p["category"] in TECH else ["עברית"],
        "days_band": BAND[p["days_band"]] if p["type"] == "reservist" else None,
        "show_days_band": p["show_days_band"] or hero, "onboarding_step": 8, "license_number": lic,
        "avg_response_hours": p["response_hours"], "created_at": iso(signup),
        "availability": "busy" if busy else "available", "busy_until": (TODAY + dt.timedelta(days=R.randint(5, 20))).date().isoformat() if busy else None,
        "is_demo": True})
    for s in p["subs"]:
        out["provider_subcategories"].append({"provider_id": ID[p["id"]], "subcategory_slug": SLUG[s]})
    for sk in h["skills"][:15]:
        out["provider_skills"].append({"provider_id": ID[p["id"]], "skill": sk[:40]})
    for i, (se, sh) in enumerate(zip(p["services"], h["services"])):
        out["service_cards"].append({"id": uid("card", p["id"], i), "provider_id": ID[p["id"]], "title": sh["title"][:60],
                                     "subcategory_slug": SLUG[se["sub"]], "description": None, "price_from": se["price_from"],
                                     "unit": se["unit"], "mode": MODE[se["mode"]], "created_at": iso(signup)})
    # Verification: approved (documents already deleted) or pending in the admin queue.
    if p["type"] == "reservist":
        days = int(p.get("form3010", {}).get("days") or {"30–59": 45, "60–119": 88, "120+": 150}[p["days_band"]])
        if verified:
            out["verification_requests"].append({
                "id": uid("ver", p["id"]), "user_id": ID[p["id"]], "kind": "form_3010", "status": "approved", "file_paths": [],
                "extracted": None, "days_total": None, "days_band": BAND[p["days_band"]], "submitted_at": iso(signup),
                "decided_at": iso(t(p["verified_at"])), "documents_deleted_at": iso(t(p["verified_at"]))})
        else:
            start = dt.date(2023, 10, 8) + dt.timedelta(days=R.randint(0, 40))
            periods, left = [], days
            while left > 0:
                n = min(left, R.randint(20, 60)); end = start + dt.timedelta(days=n - 1)
                periods.append({"from": start.isoformat(), "to": end.isoformat()}); left -= n
                start = end + dt.timedelta(days=R.randint(20, 80))
            out["verification_requests"].append({
                "id": uid("ver", p["id"]), "user_id": ID[p["id"]], "kind": "form_3010", "status": "pending", "file_paths": [],
                "extracted": {"source": "ai", "warnings": [], "files": [{"name": "טופס-3010-דמו.pdf", "ok": True, "kind": "form_3010",
                              "fullName": full, "periods": periods, "reportedDays": None, "note": "Demo data — no real document"}]},
                "days_total": days, "days_band": BAND[p["days_band"]], "submitted_at": iso(signup), "decided_at": None,
                "documents_deleted_at": None})

# Spouses: link to their reservist (approved, or accepted + pending review).
for p in E["providers"]:
    if p["type"] != "spouse":
        continue
    verified = p["status"] == "verified"
    partner = P[p["partner_id"]]
    h = HP[p["id"]]
    made = t(p["signup"]) - dt.timedelta(days=1)
    out["spouse_links"].append({
        "id": uid("spouse", p["id"]), "reservist_id": ID[partner["id"]], "spouse_user_id": ID[p["id"]],
        "invite_name": f"{h['first']} {h['last']}", "invite_phone": "+972500009999",
        "status": "approved" if verified else "accepted", "expires_at": iso(made + dt.timedelta(days=14)),
        "created_at": iso(made), "decided_at": iso(t(p["verified_at"])) if verified else None})
    out["verification_requests"].append({
        "id": uid("ver", p["id"]), "user_id": ID[p["id"]], "kind": "spouse", "status": "approved" if verified else "pending",
        "file_paths": [], "extracted": None, "days_total": None, "days_band": None, "submitted_at": iso(t(p["signup"])),
        "decided_at": iso(t(p["verified_at"])) if verified else None,
        "documents_deleted_at": iso(t(p["verified_at"])) if verified else None})

# ---------------------------------------------------------------- jobs
def budget(b, sub, mode):
    if b:
        return b["type"], b["min"], b["max"]
    return "open_to_quotes", None, None


def pad(text, n=50):
    return text if len(text) >= n else text + " פרטים נוספים בשיחה טלפונית."


for j in E["jobs"]:
    h = HJ[j["id"]]
    ID[j["id"]] = uid("job", j["id"])
    posted = t(j["posted"])
    status = JOB_STATUS[j["status"]]
    bt, bmin, bmax = budget(j["budget"], j["sub"], j["mode"])
    expires = posted + dt.timedelta(days=30)
    closed = t(j["closed_at"]) if j.get("closed_at") else None
    if status == "expired":
        expires = closed or expires
    out["jobs"].append({
        "id": ID[j["id"]], "poster_id": ID[j["poster"]], "subcategory_slug": SLUG[j["sub"]], "title": h["title"][:80],
        "description": pad(h["desc"]), "skills": [], "mode": MODE[j["mode"]],
        "city": None if j["mode"] == "remote" else CITY[j["city"]], "budget_type": bt, "budget_min": bmin, "budget_max": bmax,
        "timeline": TIMELINE[j["timeline"]], "status": status, "published_at": iso(posted), "expires_at": iso(expires),
        "application_count": 0, "closed_at": iso(closed) if status != "open" else None, "created_at": iso(posted),
        "hold_reason": None, "is_demo": True})
JROW = {r["id"]: r for r in out["jobs"]}

PITCH = [
    "שלום, ראיתי את העבודה ואני חושב/ת שאני מתאים/ה: {yrs} שנות ניסיון בתחום, עבודה מסודרת ומחיר הוגן. אשמח לתאם שיחה קצרה כבר השבוע.",
    "היי! אני {name}, {head}. עשיתי עבודות דומות לאחרונה ואשמח לשלוח דוגמאות. זמין/ה להתחיל בקרוב ואפשר לסגור פרטים בטלפון.",
    "נשמע כמו עבודה שאני עושה הרבה. {yrs} שנים בתחום, עם המלצות מלקוחות. אגיע לבדיקה ואתן הצעת מחיר מדויקת בלי התחייבות.",
]
APP_STATUS = {"sent": "sent", "viewed": "viewed", "shortlisted": "shortlisted", "contacted": "contacted", "hired": "hired",
              "not_selected": "not_selected", "credited_back": "credited_back"}


def pitch_for(pid):
    p, h = P[pid], HP[pid]
    return R.choice(PITCH).format(yrs=p["years"], name=h["first"], head=h["headline"])


for a in E["applications"]:
    ID[a["id"]] = uid("app", a["id"])
    sent = t(a["sent"])
    viewed = t(a["viewed_at"]) if a.get("viewed_at") else None
    state = APP_STATUS[a["state"]]
    j = J[a["job"]]
    decided = t(j["closed_at"]) if j.get("closed_at") and state in ("hired", "not_selected") else None
    out["applications"].append({
        "id": ID[a["id"]], "job_id": ID[a["job"]], "provider_id": ID[a["provider"]], "pitch": pitch_for(a["provider"]),
        "proposed_price": a["price"], "status": state, "sent_at": iso(sent), "viewed_at": iso(viewed),
        "contacted_at": iso((viewed or sent) + dt.timedelta(hours=3)) if state in ("contacted", "hired") else None,
        "decided_at": iso(decided), "credited_back_at": iso(t(a["credit_back_at"])) if a.get("credit_back_at") else None})

# ---------------------------------------------------------------- direct requests
REQ_DESC = "שלום, ראיתי את הפרופיל שלך ואשמח לעזרה ב{brief}. אפשר לתאם שיחה קצרה כדי לסגור פרטים ומועד? (נתוני דמו)"
DECLINE = ["אין לי זמינות כרגע", "מחוץ לאזור שלי", "התקציב לא מתאים"]


def request_budget(sub, mode, price):
    """Same budget rule as jobs: mandatory in some categories and for remote / hybrid work."""
    if CATEGORY[sub] in BUDGET_MANDATORY or mode != "onsite":
        lo = max(50, int(price or 500))
        return "fixed", lo, lo * 2
    return "open_to_quotes", None, None


def card_price(pid, sub):
    for s in P[pid]["services"]:
        if s["sub"] == sub:
            return s["price_from"]
    return None


def add_request(rid, poster, provider, sub, sent, status, responded, brief, mode=None, decline=None):
    pmode = "remote" if (P[provider]["remote"] and not P[provider]["onsite"]) else "onsite"
    mode = mode or pmode
    bt, bmin, bmax = request_budget(sub, mode, card_price(provider, sub))
    ID[rid] = uid("req", rid)
    out["direct_requests"].append({
        "id": ID[rid], "poster_id": ID[poster], "provider_id": ID[provider], "job_id": None, "subcategory_slug": SLUG[sub],
        "title": brief[:80], "description": REQ_DESC.format(brief=brief), "mode": mode,
        "city": None if mode == "remote" else CITY[C[poster]["city"]], "budget_type": bt, "budget_min": bmin, "budget_max": bmax,
        "timeline": "week", "status": status, "decline_reason": decline if status == "declined" else None, "sent_at": iso(sent),
        "expires_at": iso(sent + dt.timedelta(days=7)), "responded_at": iso(responded)})


HQ = {q["id"]: q for q in H["requests"]}
for q in E["requests"]:
    add_request(q["id"], q["poster"], q["provider"], q["sub"], t(q["sent"]), q["status"],
                t(q["responded"]) if q.get("responded") else None, HQ[q["id"]]["brief"],
                decline=R.choice(DECLINE))
# The POC allows several pending requests per pair; the app allows one.
seen = set()
for r in out["direct_requests"]:
    if r["status"] == "pending":
        k = (r["poster_id"], r["provider_id"])
        if k in seen:
            r["status"], r["responded_at"] = "declined", r["sent_at"]; r["decline_reason"] = DECLINE[0]
        seen.add(k)

# ---------------------------------------------------------------- engagements, feedback
HE = {e["id"]: e for e in H["engagements"]}
HR = {(r["engagement"], r["direction"]): r for r in H["reviews"]}
SUBSCORE = lambda o: max(1, min(5, o + R.choice([0, 0, 0, -1, 1])))


def add_engagement(eid, source, ref, poster, provider, at, title, job=None):
    ID[eid] = uid("eng", eid)
    out["engagements"].append({
        "id": ID[eid], "source": source, "application_id": ID[ref] if source == "application" else None,
        "request_id": ID[ref] if source == "request" else None, "job_id": ID[job] if job else None,
        "poster_id": ID[poster], "provider_id": ID[provider], "title": title[:200], "extra_hire": False, "created_at": iso(at)})


def add_feedback(eid, direction, poster, provider, at, worked, overall=None, comment="", no_reason=None, revealed_at=None):
    author, subject = (poster, provider) if direction == "poster_to_provider" else (provider, poster)
    yes = worked == "yes"
    out["feedback"].append({
        "id": uid("fb", eid, direction), "engagement_id": ID[eid], "author_id": ID[author], "subject_id": ID[subject],
        "direction": direction, "worked_together": worked, "no_reason": None if yes else (no_reason or "other"),
        "overall": overall if yes else None,
        "quality": SUBSCORE(overall) if yes and direction == "poster_to_provider" else None,
        "communication": SUBSCORE(overall) if yes else None,
        "reliability": SUBSCORE(overall) if yes and direction == "poster_to_provider" else None,
        "value_for_money": SUBSCORE(overall) if yes and direction == "poster_to_provider" else None,
        "brief_clarity": SUBSCORE(overall) if yes and direction == "provider_to_poster" else None,
        "fair_payment": SUBSCORE(overall) if yes and direction == "provider_to_poster" else None,
        "would_again": (overall >= 4) if yes else None, "comment": (comment or None) if yes else None,
        "comment_hidden": False, "submitted_at": iso(at), "revealed_at": iso(revealed_at)})


def add_feedback_request(eid, user, direction, eng_at, completed_at=None):
    req = eng_at + dt.timedelta(days=3)
    if req > TODAY:
        return
    age = (TODAY - req).days
    reminders = 2 if age >= 14 else (1 if age >= 7 else 0)
    blocked = completed_at is None and age >= 30
    out["feedback_requests"].append({
        "id": uid("fbr", eid, direction), "engagement_id": ID[eid], "user_id": ID[user], "direction": direction,
        "requested_at": iso(req), "reminders_sent": reminders,
        "last_reminder_at": iso(req + dt.timedelta(days=11 if reminders == 2 else 4)) if reminders else None,
        "last_answer": None, "blocked_at": iso(req + dt.timedelta(days=30)) if blocked else None, "completed_at": iso(completed_at)})


for e in E["engagements"]:
    at = t(e["at"])
    job = next((a["job"] for a in E["applications"] if a["id"] == e["ref"]), None) if e["source"] == "application" else None
    add_engagement(e["id"], e["source"], e["ref"], e["poster"], e["provider"], at, HE[e["id"]]["title"], job)
    revs = [r for r in E["reviews"] if r["engagement"] == e["id"]]
    times = {r["direction"]: t(r["at"]) for r in revs}
    for r in revs:
        hr = HR[(e["id"], r["direction"])]
        both = len(revs) == 2
        reveal = max(times.values()) if both else (t(r["at"]) + dt.timedelta(days=14) if (TODAY - t(r["at"])).days >= 14 else None)
        add_feedback(e["id"], r["direction"], e["poster"], e["provider"], t(r["at"]), r["worked"], r.get("overall"),
                     hr.get("comment", ""), NO_REASON.get(r.get("no_reason")), reveal)
    for direction, user in (("poster_to_provider", e["poster"]), ("provider_to_poster", e["provider"])):
        add_feedback_request(e["id"], user, direction, at, times.get(direction))

# ---------------------------------------------------------------- credit ledger
TX = {"welcome": "welcome", "apply": "apply", "credit_back": "credit_back", "request": "request_approve",
      "purchase": "admin_adjust", "admin_grant": "admin_adjust"}
ledger = []
for x in E["ledger"]:
    typ = TX[x["type"]]
    ref_type = {"welcome": "verification", "apply": "application", "credit_back": "application",
                "request_approve": "direct_request"}.get(typ)
    ref = {"verification": lambda r: uid("ver", r), "application": lambda r: ID[r], "direct_request": lambda r: ID[r]}[ref_type](x["ref"]) if ref_type else None
    reason = {"welcome": "קרדיטי הצטרפות באישור האימות", "admin_adjust": "מענק תמיכה בבטא (צוות)"}.get(typ)
    if typ == "credit_back":
        reason = "job_closed_without_hire" if x["note"].startswith("Job ended") else "unopened_30_days"
    if typ in ("apply", "request_approve"):
        reason = next(h["note"] for h in H["ledger"] if h["id"] == x["id"])
    ledger.append({"provider": x["provider"], "amount": x["amount"], "tx_type": typ, "reference_type": ref_type, "reference_id": ref,
                   "reason": reason, "at": t(x["at"])})


def charge(pid, amount, typ, ref_type, ref, reason, at):
    ledger.append({"provider": pid, "amount": amount, "tx_type": typ, "reference_type": ref_type, "reference_id": ref,
                   "reason": reason, "at": at})


# ---------------------------------------------------------------- scripted scenarios for the sign-in accounts
def new_app(key, job, provider, sent, status, viewed=None, price=None):
    ID[key] = uid("app", key)
    out["applications"].append({
        "id": ID[key], "job_id": ID[job], "provider_id": ID[provider], "pitch": pitch_for(provider), "proposed_price": price,
        "status": status, "sent_at": iso(sent), "viewed_at": iso(viewed),
        "contacted_at": iso(viewed + dt.timedelta(hours=2)) if status == "contacted" else None, "decided_at": None,
        "credited_back_at": None})
    charge(provider, -10, "apply", "application", ID[key], f"הגשה למשרה: {JROW[ID[job]]['title']}", sent)


def new_job(key, poster, sub, title, desc, mode, budget, timeline, posted, status="open", hold=None):
    ID[key] = uid("job", key)
    bt, bmin, bmax = budget
    row = {"id": ID[key], "poster_id": ID[poster], "subcategory_slug": SLUG[sub], "title": title, "description": pad(desc),
           "skills": [], "mode": mode, "city": None if mode == "remote" else CITY[C[poster]["city"]], "budget_type": bt,
           "budget_min": bmin, "budget_max": bmax, "timeline": timeline, "status": status, "published_at": iso(posted),
           "expires_at": iso(posted + dt.timedelta(days=30)), "application_count": 0, "closed_at": None, "created_at": iso(posted),
           "hold_reason": hold, "is_demo": True}
    out["jobs"].append(row)
    JROW[row["id"]] = row
    J[key] = {"poster": poster}


electricians = [p["id"] for p in E["providers"] if "Electricity" in p["subs"] and p["status"] == "verified" and p["id"] != "P001"]

# 1) Avi Mor (poster) — a fresh job with applicants to review; Yossi has not applied yet (apply live).
new_job("JX1", "C17", "Electricity", "החלפת לוח חשמל ישן ותוספת שקעים",
        "דירת 4 חדרים בראשון לציון. הלוח ישן ונופלים פחתים. צריך להחליף ללוח חדש עם ממסר פחת ולהוסיף 4 שקעים במטבח ובסלון.",
        "onsite", ("fixed", 1500, 2500), "week", ago(2))
for i, (pid, st) in enumerate(zip(electricians[:4], ["sent", "sent", "viewed", "shortlisted"])):
    sent = ago(1, 20 - i * 4)
    new_app(f"AX1-{i}", "JX1", pid, sent, st, viewed=sent + dt.timedelta(hours=6) if st != "sent" else None, price=1600 + i * 200)

# 2) Avi → Yossi: a direct request waiting for Yossi's answer.
add_request("RX1", "C17", "P001", "Repairs & handyman", ago(0, 20), "pending", None, "התקנת מאוורר תקרה ותאורה בסלון")

# 3) Lumen ↔ Yossi: work done 5 days ago; feedback is due from both (both can open the form).
add_request("RX2", "C01", "P001", "Electricity", ago(6), "approved", ago(5, 20), "בדיקת לוח חשמל ותאורה במשרד")
charge("P001", -2, "request_approve", "direct_request", ID["RX2"], "אישור פנייה ישירה מלומן אנליטיקס", ago(5, 20))
add_engagement("EX2", "request", "RX2", "C01", "P001", ago(5, 20), "בדיקת לוח חשמל ותאורה במשרד")
add_feedback_request("EX2", "C01", "poster_to_provider", ago(5, 20))
add_feedback_request("EX2", "P001", "provider_to_poster", ago(5, 20))

# 4) Yossi's track record: three finished jobs with revealed reviews (rating shows after 3).
HISTORY = [("C18", 52, "Electricity", "התקנת גופי תאורה בדירה", 5, "הגיע בזמן ועשה עבודה נקייה. אזמין שוב."),
           ("C21", 38, "Repairs & handyman", "תליית מדפים וטלוויזיה", 5, "מקצועי ומהיר. הסביר הכול בצורה ברורה."),
           ("C22", 24, "Electricity", "החלפת שקעים ומפסקים", 4, "עבודה טובה, עיכוב קטן אבל עדכן אותנו כל הזמן.")]
for i, (poster, days, sub, title, stars, comment) in enumerate(HISTORY):
    rid, eid = f"RH{i}", f"EH{i}"
    add_request(rid, poster, "P001", sub, ago(days + 1), "approved", ago(days), title)
    charge("P001", -2, "request_approve", "direct_request", ID[rid], f"אישור פנייה ישירה מ{HC[poster]['name']}", ago(days))
    add_engagement(eid, "request", rid, poster, "P001", ago(days), title)
    sub_at = ago(days - 4)
    add_feedback(eid, "poster_to_provider", poster, "P001", sub_at, "yes", stars, comment, revealed_at=ago(days - 5))
    add_feedback(eid, "provider_to_poster", poster, "P001", ago(days - 5), "yes", 5, "לקוח נעים, הסביר בדיוק מה צריך ושילם בזמן.",
                 revealed_at=ago(days - 5))
    add_feedback_request(eid, poster, "poster_to_provider", ago(days), sub_at)
    add_feedback_request(eid, "P001", "provider_to_poster", ago(days), ago(days - 5))

# 5) Yossi has an application under review and a saved job.
bakery = next(j["id"] for j in E["jobs"] if j["title"] == "Lighting for a new bakery branch")
if not any(a["job"] == bakery and a["provider"] == "P001" for a in E["applications"]):
    new_app("AX5", bakery, "P001", ago(2, 3), "viewed", viewed=ago(1, 10), price=2400)
out["job_saves"].append({"user_id": ID["P001"], "job_id": ID["JX1"], "created_at": iso(ago(1))})

# 6) Admin: one job held for moderation.
new_job("JX6", "C26", "Video", "צילום והפקת סרטון לאירוע פרטי בדירה",
        "מחפשים צלם לאירוע פרטי בדירה בתל אביב, כ-3 שעות צילום ועריכה של סרטון קצר. המודעה סומנה לבדיקה על ידי משתמשים.",
        "onsite", ("fixed", 1200, 2000), "week", ago(0, 6), status="held", hold="reports")

# 7) In-app notifications for the sign-in accounts.
def note(user, event, payload, hours_ago, read=False):
    at = ago(0, hours_ago)
    out["notifications"].append({"user_id": ID[user], "event": event, "payload": payload, "in_app": True,
                                 "read_at": iso(at + dt.timedelta(hours=1)) if read else None, "status": "skipped",
                                 "send_after": iso(at), "created_at": iso(at)})


note("P001", "direct_request_received", {"request_id": ID["RX1"]}, 20)
note("P001", "job_alert", {"job_id": ID["JX1"], "title": "החלפת לוח חשמל ישן ותוספת שקעים"}, 47)
if "AX5" in ID:
    note("P001", "application_viewed", {"job_id": ID[bakery], "application_id": ID["AX5"]}, 34)
note("P001", "feedback_request", {"engagement_id": ID["EX2"]}, 26)
note("P001", "feedback_revealed", {"engagement_id": ID["EH2"]}, 24 * 19, read=True)
for i in range(4):
    note("C17", "new_application", {"job_id": ID["JX1"], "application_id": ID[f"AX1-{i}"], "count": i + 1}, 44 - i * 4, read=i < 1)
note("C01", "feedback_request", {"engagement_id": ID["EX2"]}, 26)
landing = next(j["id"] for j in E["jobs"] if j["title"] == "Landing page for a new SaaS product")
note("C01", "new_application", {"job_id": ID[landing], "count": J[landing]["applicants"]}, 30)
noa_alert = next((j for j in E["jobs"] if j["status"] == "open" and j["sub"] in P["P081"]["subs"]), None)
if noa_alert:
    note("P081", "job_alert", {"job_id": ID[noa_alert["id"]], "title": HJ[noa_alert["id"]]["title"]}, 30)

# ---------------------------------------------------------------- consistency
# Application counts (withdrawn excluded; there are none).
for row in out["jobs"]:
    row["application_count"] = sum(1 for a in out["applications"] if a["job_id"] == row["id"])

# Ledger: time order, never negative (a beta grant tops up when needed), balance_after.
ledger.sort(key=lambda x: (x["at"], 0 if x["amount"] > 0 else 1))
bal = {}
final = []
for x in ledger:
    b = bal.get(x["provider"], 0)
    if b + x["amount"] < 0:
        top = 50
        b += top
        final.append({**x, "amount": top, "tx_type": "admin_adjust", "reference_type": None, "reference_id": None,
                      "reason": "מענק תמיכה בבטא (צוות)", "balance_after": b, "at": x["at"] - dt.timedelta(minutes=5)})
    b += x["amount"]
    bal[x["provider"]] = b
    final.append({**x, "balance_after": b})
for x in final:
    out["credit_transactions"].append({"provider_id": ID[x["provider"]], "amount": x["amount"], "tx_type": x["tx_type"],
                                       "reference_type": x["reference_type"], "reference_id": x["reference_id"],
                                       "balance_after": x["balance_after"], "reason": x["reason"], "created_at": iso(x["at"])})
wallets = [{"provider_id": ID[pid], "balance": b} for pid, b in bal.items()]

# Checks that mirror the database constraints.
for a in out["applications"]:
    assert 50 <= len(a["pitch"]) <= 1000, a["pitch"]
for j in out["jobs"]:
    assert 5 <= len(j["title"]) <= 80 and 50 <= len(j["description"]) <= 3000, j["title"]
for r in out["direct_requests"]:
    assert 5 <= len(r["title"]) <= 80 and 20 <= len(r["description"]) <= 1000
keys = {(f["engagement_id"], f["direction"]) for f in out["feedback"]}
assert len(keys) == len(out["feedback"])
assert all(b >= 0 for b in bal.values())
for table, rows in out.items():
    if rows:
        k0 = set(rows[0])
        assert all(set(r) == k0 for r in rows), table

data = {"reference_time": iso(TODAY), "wallets": wallets, **out}
os.makedirs(OUT_DIR, exist_ok=True)
with open(os.path.join(OUT_DIR, "load_demo.sql"), "w", encoding="utf-8") as f:
    f.write("-- Joby demo data (generated by scripts/demo/build_demo.py — do not edit by hand).\n")
    f.write("-- Paste into Supabase → SQL Editor → Run. Remove later with: select private.purge_demo();\n")
    f.write("select private.load_demo($demo$")
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write("$demo$::jsonb);\n")
print({k: len(v) for k, v in out.items()}, "wallets", len(wallets), "kB", os.path.getsize(os.path.join(OUT_DIR, "load_demo.sql")) // 1024)
