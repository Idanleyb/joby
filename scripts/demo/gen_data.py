"""Joby POC demo data generator.
Simulates a 12-week pilot (Aug 2 - Oct 25, 2026): 100 providers, 50 jobs,
posters, applications, direct requests, engagements, reviews and a full
append-only credit ledger that follows the PRD v1.1 rules.
"""
import json, random, csv, datetime as dt, os

R = random.Random(3010)
TODAY = dt.datetime(2026, 10, 25, 18, 0)
START = dt.datetime(2026, 8, 2, 9, 0)
DAYS = (TODAY - START).days  # 84

WELCOME, APPLY, REQ = 100, 10, 2
BUNDLES = [(50, 100), (120, 220), (300, 400)]  # credits, NIS (founder pricing, Oct 25)

# ---------------------------------------------------------------- taxonomy
# sub: (category, [headlines], service title, price_lo, price_hi, unit, skills)
SUBS = {
 "Art & illustration": ("Design", ["Illustrator for brands and children's books", "Illustrator and visual storyteller"], "Custom illustration", 350, 1500, "project", ["Illustration", "Procreate", "Adobe Illustrator", "Character design"]),
 "Video": ("Design", ["Video editor for social and brand films", "Videographer and editor"], "Short-form video edit", 250, 900, "job", ["Premiere Pro", "DaVinci Resolve", "Reels", "Color grading"]),
 "Animation": ("Design", ["2D motion designer", "Motion and explainer animation"], "60-second explainer animation", 1800, 4500, "project", ["After Effects", "Motion graphics", "Lottie", "Storyboarding"]),
 "Development": ("Programming & Tech", ["Full-stack developer (React, Node)", "Backend developer, APIs and integrations", "Web developer for small businesses"], "Landing page build", 2500, 8000, "project", ["React", "Node.js", "TypeScript", "Next.js", "PostgreSQL"]),
 "Data engineering": ("Programming & Tech", ["Data engineer, pipelines and BI", "BI developer and SQL specialist"], "Dashboard setup", 3000, 9000, "project", ["SQL", "Python", "dbt", "BigQuery", "Looker Studio"]),
 "AI implementation": ("Programming & Tech", ["AI automation builder", "LLM integrations for small teams"], "AI workflow automation", 2500, 7000, "project", ["LLM APIs", "Python", "n8n", "Make", "RAG"]),
 "Content": ("Digital Marketing", ["Copywriter, Hebrew and English", "Content writer for tech and B2B"], "Website copy package", 1200, 3500, "project", ["Copywriting", "UX writing", "Hebrew", "English"]),
 "Social media": ("Digital Marketing", ["Social media manager for small businesses", "Instagram and TikTok content manager"], "Monthly social management", 1800, 4500, "project", ["Instagram", "TikTok", "Content calendar", "Canva"]),
 "Campaigns": ("Digital Marketing", ["Performance marketer, Meta and Google", "Paid acquisition specialist"], "Campaign setup and launch", 1500, 4000, "project", ["Meta Ads", "Google Ads", "GA4", "Conversion tracking"]),
 "SEO": ("Digital Marketing", ["SEO specialist", "Technical SEO and content strategy"], "Technical SEO audit", 1500, 3500, "project", ["SEO", "Search Console", "Ahrefs", "Content strategy"]),
 "Sales": ("Business", ["B2B sales consultant", "Sales process and CRM setup"], "Sales process setup", 1200, 2500, "day", ["CRM", "HubSpot", "Lead generation", "Cold outreach"]),
 "Project management": ("Business", ["Project manager, ops and tech", "Operations and project lead"], "Project management", 150, 250, "hour", ["Monday.com", "Jira", "Agile", "Budgeting"]),
 "Accounting services": ("Finance", ["Bookkeeper for freelancers and small businesses", "Bookkeeper and payroll"], "Monthly bookkeeping", 450, 1200, "project", ["Bookkeeping", "VAT reports", "Payroll", "Rivhit"]),
 "Coaching": ("Consulting", ["Business coach for the self-employed", "Career coach for reservists returning to work"], "Coaching session", 250, 450, "hour", ["Business coaching", "Career coaching", "Pricing strategy"]),
 "Legal services": ("Lawyers", ["Lawyer, contracts and small business", "Labor and commercial law"], "Contract review", 600, 1800, "job", ["Contracts", "Commercial law", "Labor law"]),
 "Plumbing": ("Household", ["Plumber, repairs and installations", "Plumber and leak detection"], "Leak detection and repair", 250, 600, "job", ["Leak detection", "Water heaters", "Drain cleaning"]),
 "Electricity": ("Household", ["Licensed electrician", "Electrician, homes and offices"], "Panel and outlet work", 300, 900, "job", ["Electrical panels", "Lighting", "EV chargers"]),
 "Painting": ("Household", ["Painter, apartments and offices", "Painter and plaster work"], "Room painting", 900, 2500, "job", ["Interior painting", "Plaster", "Waterproofing"]),
 "Carpentry": ("Household", ["Carpenter, custom furniture", "Carpenter and kitchen installer"], "Custom shelving", 1500, 5000, "project", ["Custom furniture", "Kitchens", "Wood finishing"]),
 "Repairs & handyman": ("Household", ["Handyman, small home repairs", "Handyman and furniture assembly"], "Handyman visit (2 hours)", 250, 450, "job", ["Furniture assembly", "Hanging and mounting", "Small repairs"]),
 "Construction": ("Household", ["Renovation contractor", "Construction and bathroom renovations"], "Bathroom renovation", 15000, 35000, "project", ["Renovation", "Tiling", "Project supervision"]),
 "Car services": ("Household", ["Mobile mechanic", "Car electrician and diagnostics"], "Car service at your door", 350, 800, "job", ["Diagnostics", "Brakes", "Batteries"]),
 "Gardening": ("Household", ["Gardener and irrigation", "Garden design and maintenance"], "Garden maintenance visit", 250, 500, "job", ["Irrigation", "Pruning", "Garden design"]),
 "Mobile phone repair": ("Household", ["Phone and tablet repair", "Mobile device technician"], "Screen replacement", 250, 700, "job", ["Screen repair", "Battery replacement", "Data recovery"]),
 "Home decoration": ("Household", ["Interior stylist", "Home styling and decor"], "Home styling consultation", 250, 400, "hour", ["Interior styling", "Color consulting", "Space planning"]),
 "Music & audio": ("Music & Audio", ["Sound engineer and producer", "Podcast and voice-over editor"], "Podcast mixing per episode", 250, 600, "job", ["Mixing", "Mastering", "Pro Tools", "Voice-over"]),
 "Sport & fitness": ("Others", ["Personal trainer", "Functional fitness coach"], "Personal training session", 180, 300, "hour", ["Strength training", "Functional fitness", "Running"]),
 "Food & catering": ("Others", ["Private chef and small-event catering", "Home baker and event desserts"], "Event catering (per guest)", 90, 180, "job", ["Catering", "Kosher", "Baking"]),
 "Transportation (taxi, bus)": ("Others", ["Van and minibus transportation", "Driver for groups and airport transfers"], "Airport transfer", 300, 600, "job", ["Minibus", "Airport transfers", "Group trips"]),
 "Makeup & hair": ("Others", ["Makeup artist for events", "Hair and makeup for brides"], "Event makeup", 350, 700, "job", ["Bridal makeup", "Hair styling", "Events"]),
 "Pets": ("Others", ["Dog trainer", "Dog walker and pet sitter"], "Training session", 200, 300, "hour", ["Dog training", "Pet sitting"]),
 "Medical services": ("Others", ["Physiotherapist (home visits)", "Licensed physiotherapist"], "Home physiotherapy session", 250, 400, "hour", ["Physiotherapy", "Sports injuries", "Rehabilitation"]),
}
CATS = ["Design", "Programming & Tech", "Digital Marketing", "Music & Audio", "Business", "Finance", "Consulting", "Lawyers", "Household", "Others"]
BUDGET_MANDATORY = {"Programming & Tech", "Digital Marketing", "Business", "Finance", "Lawyers"}
LICENSED = {"Legal services", "Medical services"}

# provider subcategory weights (more trades + tech, like the real reserve population)
SUB_W = {s: 1.0 for s in SUBS}
for s in ["Development", "Electricity", "Plumbing", "Campaigns", "Repairs & handyman", "Content", "Painting", "Social media", "Accounting services", "Video"]:
    SUB_W[s] = 2.6
for s in ["AI implementation", "Data engineering", "Project management", "Carpentry", "Car services", "Sport & fitness"]:
    SUB_W[s] = 1.6
RELATED = {  # second subcategory tends to be related
 "Development": ["AI implementation", "Data engineering"], "AI implementation": ["Development"], "Data engineering": ["Development", "AI implementation"],
 "Content": ["Social media", "SEO"], "Social media": ["Content", "Campaigns"], "Campaigns": ["SEO", "Social media"], "SEO": ["Content", "Campaigns"],
 "Video": ["Animation", "Art & illustration"], "Animation": ["Video"], "Art & illustration": ["Animation"],
 "Plumbing": ["Repairs & handyman"], "Electricity": ["Repairs & handyman"], "Painting": ["Repairs & handyman"], "Carpentry": ["Repairs & handyman", "Home decoration"],
 "Construction": ["Painting", "Plumbing"], "Repairs & handyman": ["Painting"], "Sales": ["Project management"], "Project management": ["Sales"],
 "Coaching": ["Sales"], "Makeup & hair": [], "Sport & fitness": ["Coaching"],
}

CITIES = [("Tel Aviv", 14), ("Jerusalem", 10), ("Rishon LeZion", 8), ("Haifa", 7), ("Be'er Sheva", 7), ("Petah Tikva", 5), ("Netanya", 5),
          ("Ashdod", 5), ("Holon", 4), ("Ramat Gan", 4), ("Modi'in", 4), ("Rehovot", 4), ("Kfar Saba", 3), ("Herzliya", 3), ("Ra'anana", 3),
          ("Ashkelon", 3), ("Rosh HaAyin", 2), ("Kiryat Shmona", 2), ("Sderot", 2)]
REGION = {"Tel Aviv": "Gush Dan", "Rishon LeZion": "Gush Dan", "Petah Tikva": "Gush Dan", "Holon": "Gush Dan", "Ramat Gan": "Gush Dan",
          "Herzliya": "Sharon", "Netanya": "Sharon", "Kfar Saba": "Sharon", "Ra'anana": "Sharon", "Rosh HaAyin": "Sharon",
          "Jerusalem": "Jerusalem", "Modi'in": "Jerusalem", "Haifa": "North", "Kiryat Shmona": "North",
          "Be'er Sheva": "South", "Ashdod": "South", "Ashkelon": "South", "Sderot": "South", "Rehovot": "Shfela"}

MALE = ["Yossi", "Itay", "Omer", "Daniel", "Amit", "Noam", "Eyal", "Tomer", "Lior", "Yonatan", "Ariel", "Nadav", "Ron", "Gal", "Shai", "Ido", "Asaf",
        "Ofir", "Roee", "Elad", "Matan", "Yuval", "Erez", "Guy", "Avi", "Moshe", "Barak", "Alon", "Doron", "Nir", "Uri", "Eitan", "Ben", "Tal", "Oren",
        "Hagai", "Yair", "Kobi", "Rami", "Dor", "Michael", "Aviv", "Shahar", "Ziv", "Amir", "Ohad", "Raz", "Yaniv", "Sagi"]
FEMALE = ["Noa", "Maya", "Shira", "Tamar", "Michal", "Yael", "Hila", "Inbal", "Keren", "Adi", "Roni", "Dana", "Liat", "Neta", "Merav", "Sapir",
          "Efrat", "Rotem", "Moran", "Anat", "Galit", "Orly", "Chen", "Osnat", "Lihi"]
LAST = ["Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Dahan", "Avraham", "Friedman", "Azulay", "Malka", "Katz", "Shapira", "Ben-David", "Hadad",
        "Amar", "Gabay", "Ohana", "Golan", "Segal", "Rosen", "Navon", "Sasson", "Elbaz", "Weiss", "Shalom", "Barak", "Tzur", "Harel", "Carmi", "Yosef",
        "Kaplan", "Alon", "Ziv", "Nahum", "Levy", "Eliyahu", "Gold", "Sharabi", "Dvir", "Ashkenazi"]

BIO = ["{yrs} years in the field. Lost most of my regular clients during {days} days of reserve duty and rebuilding now.",
       "Self-employed for {yrs} years. Reliable, on time, and I answer my phone. Served {days} days since October 7.",
       "{yrs} years of experience with private clients and small businesses. Happy to give a quote the same day.",
       "Freelancer with {yrs} years of experience. Back from reserve duty and taking new projects.",
       "Working independently for {yrs} years. Clear pricing, clean work, and references on request."]
SPOUSE_BIO = ["{yrs} years of experience. Kept the house running through my partner's {days} days of service and now growing my own client list.",
              "Freelancer with {yrs} years in the field. My partner served {days} days; my projects stalled, and I'm rebuilding them now."]

def wchoice(pairs):
    tot = sum(w for _, w in pairs); x = R.random() * tot
    for v, w in pairs:
        x -= w
        if x <= 0: return v
    return pairs[-1][0]

def iso(t): return t.strftime("%Y-%m-%dT%H:%M")
def days_band(d): return "120+" if d >= 120 else ("60–119" if d >= 60 else "30–59")

# ---------------------------------------------------------------- providers
providers = []
used_names = set()
def unique_name(pool):
    while True:
        n = (R.choice(pool), R.choice(LAST))
        if n not in used_names:
            used_names.add(n); return n

for i in range(100):
    pid = f"P{i+1:03d}"
    is_spouse = i >= 80
    if i == 0:  # the hero persona from the PRD
        first, last, city, subs = "Yossi", "Mizrahi", "Rishon LeZion", ["Electricity", "Repairs & handyman"]
        used_names.add((first, last))
    elif i == 80:
        first, last, city, subs = "Noa", "Barak", "Tel Aviv", ["Art & illustration", "Animation"]
        used_names.add((first, last))
    else:
        if is_spouse:
            first, last = unique_name(FEMALE if R.random() < 0.85 else MALE)
        else:
            first, last = unique_name(MALE if R.random() < 0.88 else FEMALE)
        city = wchoice(CITIES)
        s1 = wchoice(list(SUB_W.items()))
        subs = [s1]
        if R.random() < 0.6 and RELATED.get(s1):
            subs.append(R.choice(RELATED[s1]))
        if R.random() < 0.15:
            s3 = wchoice(list(SUB_W.items()))
            if s3 not in subs: subs.append(s3)
    cat = SUBS[subs[0]][0]
    days = R.choice([R.randint(30, 59), R.randint(60, 119), R.randint(60, 119), R.randint(120, 290), R.randint(120, 290)])
    yrs = R.randint(2, 18)
    # signup day: front-loaded launch wave + steady trickle
    sd = int(min(DAYS - 1, abs(R.gauss(0, 22)))) if R.random() < 0.55 else R.randint(0, DAYS - 1)
    if i == 0: sd = 1
    if i == 80: sd = 3
    signup = START + dt.timedelta(days=sd, hours=R.randint(0, 12), minutes=R.randint(0, 59))
    remote = cat in ("Programming & Tech", "Digital Marketing", "Design", "Business", "Finance", "Consulting", "Lawyers", "Music & Audio")
    onsite = cat in ("Household", "Others") or R.random() < 0.3
    s = SUBS[subs[0]]
    headline = R.choice(s[1])
    services = []
    for sub in subs[: R.choice([1, 2, 2, 3])]:
        ss = SUBS[sub]
        price = round(R.uniform(ss[3], (ss[3] + ss[4]) / 2) / 10) * 10
        services.append({"title": ss[2], "sub": sub, "price_from": price if R.random() > 0.12 else None, "unit": ss[5],
                         "mode": "both" if (remote and onsite) else ("remote" if remote else "on-site")})
    skills = []
    for sub in subs:
        skills += SUBS[sub][6]
    skills = list(dict.fromkeys(skills))[:8]
    bio = R.choice(SPOUSE_BIO if is_spouse else BIO).format(yrs=yrs, days=days)
    providers.append({
        "id": pid, "first": first, "last": last, "type": "spouse" if is_spouse else "reservist", "city": city, "region": REGION[city],
        "radius": R.choice([10, 25, 25, 50, "nationwide"]) if onsite else None, "remote": remote, "onsite": onsite,
        "category": cat, "subs": subs, "skills": skills, "headline": headline, "bio": bio, "years": yrs,
        "days_band": days_band(days), "show_days_band": R.random() < 0.55, "services": services,
        "license": f"{R.randint(10000, 99999)}" if subs[0] in LICENSED else None,
        "cv": R.random() < 0.72, "photo_hue": R.randint(0, 359),
        "signup": signup, "status": "verified", "verified_at": None,
        "popularity": R.random() ** 1.6, "payer": R.random() < 0.45, "activity": R.choice([0.4, 0.7, 1.0, 1.0, 1.3, 2.2]),
        "response_hours": R.choice([1, 2, 3, 4, 6, 8, 12, 24]),
    })
# verification outcomes: newest few still pending, a few rejected then resubmitted
by_signup = sorted(providers, key=lambda p: p["signup"])
pending = set(p["id"] for p in by_signup[-7:] if p["id"] not in ("P001", "P081"))
for p in providers:
    if p["id"] in pending:
        p["status"] = "pending"
        p["signup"] = TODAY - dt.timedelta(hours=R.randint(3, 30))
        p["form3010"] = {"forms": R.randint(1, 6), "days": int(p["days_band"].split("–")[0].rstrip("+")) + R.randint(0, 25)}
    else:
        delay = R.uniform(2, 30)
        p["verified_at"] = min(TODAY - dt.timedelta(hours=1), p["signup"] + dt.timedelta(hours=delay))
        p["verify_hours"] = round((p["verified_at"] - p["signup"]).total_seconds() / 3600, 1)
for p in R.sample([p for p in providers if p["status"] == "verified" and p["id"] not in ("P001", "P081")], 3):
    p["rejected_first"] = R.choice(["Unreadable file", "Name mismatch", "Under 30 days on first submission"])
# spouses link to a reservist
reservists = [p for p in providers if p["type"] == "reservist"]
for p in providers:
    if p["type"] == "spouse":
        partner = R.choice([r for r in reservists if not r.get("spouse_id")])
        partner["spouse_id"] = p["id"]; p["partner_id"] = partner["id"]; p["last"] = partner["last"] if R.random() < 0.7 else p["last"]
        if p["status"] == "verified" and partner["status"] == "verified" and partner["verified_at"] > p["verified_at"]:
            p["verified_at"] = partner["verified_at"] + dt.timedelta(hours=R.uniform(2, 20))
            if p["verified_at"] > TODAY: p["status"] = "pending"; p["verified_at"] = None
P = {p["id"]: p for p in providers}
# ensure a 1:1 provider mapping for P081 (Noa) to P001? keep realistic: Noa linked to a reservist above.

# ---------------------------------------------------------------- posters
POSTERS = [
 ("Lumen Analytics", "HR or recruiter", "Tel Aviv"), ("Ofek Logistics", "Business", "Ashdod"), ("Tamar Bakery", "Business", "Jerusalem"),
 ("Nofim Dental Clinic", "Business", "Ramat Gan"), ("Shaked Realty", "Business", "Herzliya"), ("Gefen Coffee Roasters", "Business", "Haifa"),
 ("Arava Solar", "Business", "Be'er Sheva"), ("Hadar Fitness Studio", "Business", "Modi'in"), ("Pardes Events", "Business", "Rishon LeZion"),
 ("Yarok Community Association", "Public body or non-profit", "Sderot"), ("Brightpath Software (HR)", "HR or recruiter", "Petah Tikva"),
 ("Kinneret Boutique Hotel", "Business", "Haifa"), ("Negev Families Fund", "Public body or non-profit", "Be'er Sheva"),
 ("Orion Cyber (HR)", "HR or recruiter", "Tel Aviv"), ("Shalev Law Office", "Business", "Jerusalem"), ("Mishol Kindergartens", "Business", "Rehovot"),
 ("Avi Mor", "Private person", "Rishon LeZion"), ("Michal Rubin", "Private person", "Tel Aviv"), ("Eli Gross", "Private person", "Netanya"),
 ("Ruth Amsalem", "Private person", "Jerusalem"), ("Dvora Klein", "Private person", "Kfar Saba"), ("Assaf Tal", "Private person", "Holon"),
 ("Sigal Ben-Ami", "Private person", "Ashkelon"), ("Yaron Peleg", "Private person", "Ra'anana"), ("Hagit Levin", "Private person", "Haifa"),
 ("Zohar Media", "Business", "Tel Aviv"), ("Tirosh Winery", "Business", "Modi'in"), ("Galil Tech Hub", "Public body or non-profit", "Kiryat Shmona"),
]
posters = []
for i, (n, t, c) in enumerate(POSTERS):
    posters.append({"id": f"C{i+1:02d}", "name": n, "type": t, "city": c, "since": iso(START + dt.timedelta(days=R.randint(0, 40))),
                    "jobs_posted": 0, "hires": 0, "closed": 0, "rating": [], "founding50": t != "Private person" and R.random() < 0.7})
C = {c["id"]: c for c in posters}

# ---------------------------------------------------------------- jobs (50)
# (sub, title, description, mode, poster, budget (type,min,max) or None, timeline)
JOBS = [
 ("Development", "Landing page for a new SaaS product", "We are launching a B2B analytics product and need a fast, responsive landing page in Next.js with a signup form connected to HubSpot. Copy and design are ready.", "remote", "C01", ("fixed", 4000, 7000), "Within a month"),
 ("Development", "Fix checkout bugs in our WooCommerce store", "Customers report failed payments on mobile. Need someone to debug the checkout flow and the payment plugin, and test on iOS and Android.", "remote", "C06", ("fixed", 1200, 2500), "ASAP"),
 ("Development", "Backend developer for a 3-month contract", "Node.js and PostgreSQL. Building internal APIs for our routing system. Two days a week on-site in Ashdod, the rest remote.", "both", "C02", ("hourly", 160, 220), "Within a week"),
 ("AI implementation", "Automate lead intake with an AI assistant", "Leads arrive from WhatsApp, the website and Facebook. We want them summarized, scored and pushed to our CRM automatically.", "remote", "C05", ("fixed", 3000, 6000), "Within a month"),
 ("AI implementation", "Chatbot for our clinic's appointment questions", "A simple assistant that answers opening hours, prices and booking questions on our website and WhatsApp, in Hebrew.", "remote", "C04", ("fixed", 2500, 4500), "Flexible"),
 ("Data engineering", "Sales dashboard in Looker Studio", "Connect our Priority ERP exports and Google Ads data into one weekly sales dashboard for management.", "remote", "C09", ("fixed", 3000, 5500), "Within a month"),
 ("Data engineering", "Data analyst for donor reporting", "Clean and analyze three years of donor data and build a quarterly report template for the board.", "remote", "C13", ("fixed", 2500, 4000), "Within a month"),
 ("Content", "Website copy in Hebrew and English", "Rewrite 6 pages of our boutique hotel website in both languages. Warm, personal tone. We provide photos and room details.", "remote", "C12", ("fixed", 1800, 3200), "Within a month"),
 ("Content", "Blog posts on cybersecurity for SMBs", "Four 1,200-word posts a month in English, aimed at small business owners. Technical review is done by our team.", "remote", "C14", ("fixed", 2400, 3600), "Within a week"),
 ("Social media", "Instagram management for a bakery", "3 posts and 5 stories a week, including shooting at the bakery once a week. Jerusalem-based preferred.", "both", "C03", ("fixed", 2000, 3000), "ASAP"),
 ("Social media", "TikTok content for a fitness studio", "8 short videos a month from our classes, edited and posted with captions. We want to reach women 25–45 in Modi'in.", "both", "C08", ("fixed", 1800, 2800), "Within a week"),
 ("Campaigns", "Google Ads for a dental clinic", "Set up and run search campaigns for implants and whitening. Monthly budget ₪8,000. Conversion tracking on calls and forms.", "remote", "C04", ("fixed", 1500, 2500), "Within a week"),
 ("Campaigns", "Meta lead campaign for solar installations", "Lead campaign for homeowners in the south. Need creative variations, a lead form and CRM sync.", "remote", "C07", ("fixed", 2500, 4000), "Within a month"),
 ("Campaigns", "Fundraising campaign for families in the Negev", "Digital campaign ahead of the holidays: landing page, Meta ads and a WhatsApp sharing kit.", "remote", "C13", ("fixed", 3000, 5000), "Within a month"),
 ("SEO", "SEO audit for a real estate website", "Technical audit plus a 3-month content plan for neighborhood pages in Herzliya and Ra'anana.", "remote", "C05", ("fixed", 2000, 3500), "Flexible"),
 ("Art & illustration", "Illustrations for a children's book", "12 full-page illustrations for a Hebrew picture book about a dog whose owner is away on reserve duty.", "remote", "C21", ("fixed", 4000, 7000), "Flexible"),
 ("Art & illustration", "Wine label illustration", "A hand-drawn label for our new rosé. Botanical style, 2 rounds of revisions.", "remote", "C27", ("fixed", 1500, 2500), "Within a month"),
 ("Video", "Event video for a corporate family day", "Film and edit a 3-minute highlights video plus 5 reels from our family day in Rishon LeZion.", "on-site", "C09", None, "Within a week"),
 ("Video", "Short testimonial videos for a recruiting campaign", "Interview 6 employees and edit 6 one-minute videos for LinkedIn. Office in Petah Tikva.", "on-site", "C11", ("fixed", 3500, 5500), "Within a month"),
 ("Animation", "60-second explainer for a community program", "Animated explainer about our new support program for families of reservists. Script ready.", "remote", "C10", ("fixed", 2500, 4000), "Within a month"),
 ("Sales", "Set up a sales pipeline in HubSpot", "Define stages, build email sequences and train two salespeople. About 5 working days.", "both", "C07", ("hourly", 150, 220), "Within a week"),
 ("Project management", "Project manager for an office move", "Coordinate contractors, IT and logistics for a 60-person office move in November.", "on-site", "C14", ("hourly", 160, 230), "ASAP"),
 ("Accounting services", "Monthly bookkeeping for a small studio", "Bookkeeping, VAT reports and annual report prep for a 3-person fitness studio.", "remote", "C08", ("fixed", 600, 900), "Within a week"),
 ("Accounting services", "Bookkeeper for a non-profit", "Monthly bookkeeping and donor receipts (Section 46). About 80 transactions a month.", "both", "C10", ("fixed", 800, 1200), "Within a month"),
 ("Coaching", "Career coaching workshop for returning reservists", "Two 3-hour workshops for 20 reservists returning to the job market. Kiryat Shmona tech hub.", "on-site", "C28", None, "Within a month"),
 ("Legal services", "Review a supplier agreement", "A 14-page supply agreement with a European distributor needs review and comments in English.", "remote", "C27", ("fixed", 1000, 1800), "Within a week"),
 ("Legal services", "Employment contracts template", "Standard employment contract and NDA templates for a growing software team.", "remote", "C11", ("fixed", 1500, 2500), "Within a month"),
 ("Plumbing", "Leaking water heater in the bathroom", "Water heater (dud shemesh) leaks into the bathroom ceiling. Need someone this week in Rishon LeZion.", "on-site", "C17", None, "ASAP"),
 ("Plumbing", "Replace kitchen faucet and drain", "New faucet is already bought. Also need the drain under the sink replaced.", "on-site", "C22", ("fixed", 300, 500), "Within a week"),
 ("Plumbing", "Plumber for a small restaurant kitchen", "Grease trap cleaning and two sink installations before opening.", "on-site", "C06", None, "ASAP"),
 ("Electricity", "Install an EV charger at home", "Private house in Kfar Saba. Panel is about 15 meters from the parking spot. Charger already purchased.", "on-site", "C21", ("fixed", 1500, 2800), "Within a month"),
 ("Electricity", "Lighting for a new bakery branch", "Track lighting and 12 new outlets in a 60 m² store. Plans available.", "on-site", "C03", None, "Within a week"),
 ("Electricity", "Electrician for a kindergarten safety check", "Annual safety inspection and repairs in three kindergartens in Rehovot.", "on-site", "C16", ("fixed", 1800, 3000), "Within a month"),
 ("Painting", "Paint a 4-room apartment before move-in", "About 110 m² of walls, white, plus repairs to two cracks. Ramat Gan.", "on-site", "C18", None, "Within a week"),
 ("Painting", "Repaint hotel corridors", "Three floors of corridors, work only between 10:00 and 16:00.", "on-site", "C12", ("fixed", 8000, 14000), "Within a month"),
 ("Carpentry", "Custom bookshelf for a living room wall", "Wall 3.2 m wide, floor to ceiling, oak veneer. Netanya.", "on-site", "C19", None, "Flexible"),
 ("Repairs & handyman", "Assemble IKEA furniture and hang shelves", "One wardrobe, two beds and four shelves. Holon, third floor with an elevator.", "on-site", "C22", ("fixed", 400, 700), "Within a week"),
 ("Repairs & handyman", "Handyman for monthly office maintenance", "4 hours a month of small repairs in our Tel Aviv office.", "on-site", "C26", ("hourly", 120, 180), "Flexible"),
 ("Construction", "Bathroom renovation", "Full renovation of a 5 m² bathroom including tiling and a new shower. Jerusalem.", "on-site", "C20", None, "Within a month"),
 ("Car services", "Battery and brake check at the office lot", "Quarterly check for 6 company cars at our Ashdod site.", "on-site", "C02", ("fixed", 800, 1400), "Within a month"),
 ("Gardening", "Garden maintenance every two weeks", "Private garden of about 80 m² plus drip irrigation fix. Ra'anana.", "on-site", "C24", None, "Flexible"),
 ("Gardening", "Garden for a community center", "Plant and set up irrigation for a 200 m² community garden in Sderot.", "on-site", "C10", ("fixed", 3000, 5000), "Within a month"),
 ("Mobile phone repair", "Replace screens on 5 company phones", "Five iPhone 13 screens. Pick up and drop off at our Tel Aviv office.", "on-site", "C26", ("fixed", 1200, 2000), "ASAP"),
 ("Home decoration", "Style a model apartment for sale", "Two-day styling of a 4-room model apartment in Herzliya for photos and open house.", "on-site", "C05", None, "Within a week"),
 ("Music & audio", "Edit and mix a weekly podcast", "45-minute episodes in Hebrew, 4 a month. Remove noise, add intro and outro.", "remote", "C25", ("fixed", 1000, 1800), "Within a week"),
 ("Sport & fitness", "Personal trainer for twice-weekly sessions", "Home sessions in Haifa, morning hours. Focus on back strength.", "on-site", "C25", None, "Within a week"),
 ("Food & catering", "Catering for a 40-person team lunch", "Dairy, kosher, at our Tel Aviv office. Vegetarian options needed.", "on-site", "C01", ("fixed", 3500, 5500), "Within a month"),
 ("Transportation (taxi, bus)", "Minibus for a wedding weekend", "Two round trips between Be'er Sheva and the venue, 18 passengers.", "on-site", "C23", None, "Within a month"),
 ("Makeup & hair", "Bridal makeup and hair", "Bride plus mother and two sisters, morning of the wedding in Ashkelon.", "on-site", "C23", None, "Within a month"),
 ("Medical services", "Home physiotherapy after knee surgery", "Two sessions a week for six weeks in Jerusalem. Licensed physiotherapist only.", "on-site", "C20", None, "ASAP"),
]
assert len(JOBS) == 50

jobs = []
post_days = sorted(max(0, DAYS - 1 - int(abs(R.gauss(0, 32)))) for _ in range(50))
order = list(range(50)); R.shuffle(order)
for k, idx in enumerate(order):
    sub, title, desc, mode, cid, budget, timeline = JOBS[idx]
    cat = SUBS[sub][0]
    posted = START + dt.timedelta(days=post_days[k], hours=R.randint(7, 21), minutes=R.randint(0, 59))
    poster = C[cid]
    jobs.append({"id": f"J{k+1:03d}", "sub": sub, "category": cat, "title": title, "desc": desc, "mode": mode, "city": poster["city"],
                 "region": REGION[poster["city"]], "poster": cid, "budget": None if budget is None else {"type": budget[0], "min": budget[1], "max": budget[2]},
                 "timeline": timeline, "posted": posted, "by_admin": R.random() < 0.3, "views": 0})
    poster["jobs_posted"] += 1
J = {j["id"]: j for j in jobs}
# budget rule sanity
for j in jobs:
    if (j["category"] in BUDGET_MANDATORY or j["mode"] != "on-site"):
        assert j["budget"], (j["title"])

# ---------------------------------------------------------------- applications
def verified_by(p, t): return p["status"] == "verified" and p["verified_at"] <= t
def area_ok(p, j):
    if j["mode"] in ("remote", "both") and p["remote"]: return True
    if j["mode"] in ("on-site", "both") and p["onsite"]:
        return p["radius"] in ("nationwide", 50) or REGION[p["city"]] == j["region"] or R.random() < 0.15
    return False

apps = []
for j in jobs:
    open_until = j["posted"] + dt.timedelta(days=21)
    cands = []
    for p in providers:
        if j["sub"] in p["subs"]: w = 1.0
        elif p["category"] == j["category"]: w = 0.45
        else: continue
        if not area_ok(p, j): continue
        cands.append((p, w * p["activity"]))
    R.shuffle(cands)
    for p, w in cands:
        if R.random() < min(0.95, 0.85 * w):
            t = j["posted"] + dt.timedelta(hours=R.expovariate(1 / 40))
            if t > open_until or t > TODAY: continue
            if not verified_by(p, t):
                if p["status"] == "verified" and p["verified_at"] < open_until and p["verified_at"] < TODAY:
                    t = p["verified_at"] + dt.timedelta(hours=R.uniform(1, 30))
                    if t > open_until or t > TODAY: continue
                else:
                    continue
            if len([a for a in apps if a["job"] == j["id"]]) >= 30: break
            pitch_price = None
            if j["budget"] and R.random() < 0.7:
                pitch_price = int(round(R.uniform(j["budget"]["min"], j["budget"]["max"]) / 10) * 10)
            apps.append({"id": f"A{len(apps)+1:04d}", "job": j["id"], "provider": p["id"], "sent": t, "price": pitch_price, "dropped": False})
# Yossi (P001) applies to two jobs live in the demo? he has history too.

# ---------------------------------------------------------------- job outcomes
for j in jobs:
    ja = sorted([a for a in apps if a["job"] == j["id"]], key=lambda a: a["sent"])
    end = j["posted"] + dt.timedelta(days=21)
    age = (TODAY - j["posted"]).days
    r = R.random()
    if not ja:
        j["status"] = "open" if end > TODAY else "expired"
        j["closed_at"] = None if j["status"] == "open" else end
        continue
    if age < 6:
        j["status"] = "open"
    elif age < 21:
        j["status"] = "hired" if r < 0.42 else "open"
    else:
        j["status"] = "hired" if r < 0.6 else ("closed" if r < 0.78 else "expired")
    if j["status"] == "hired":
        first_t = ja[0]["sent"]
        hire_t = min(TODAY - dt.timedelta(hours=2), first_t + dt.timedelta(days=R.uniform(2, 9)))
        j["closed_at"] = hire_t
        eligible = [a for a in ja if a["sent"] < hire_t - dt.timedelta(hours=3)] or ja[:1]
        hired = R.choices(eligible, weights=[0.3 + P[a["provider"]]["popularity"] for a in eligible])[0]
        j["hired_app"] = hired["id"]
    elif j["status"] == "closed":
        j["closed_at"] = j["posted"] + dt.timedelta(days=R.uniform(8, 20))
    elif j["status"] == "expired":
        j["closed_at"] = end
    else:
        j["closed_at"] = None

# application states and credit-back times
for a in apps:
    j = J[a["job"]]
    viewed = R.random() < 0.8
    a["viewed_at"] = a["sent"] + dt.timedelta(hours=R.uniform(1, 90)) if viewed else None
    if a["viewed_at"] and (a["viewed_at"] > TODAY or (j["closed_at"] and a["viewed_at"] > j["closed_at"])):
        a["viewed_at"] = None
    a["credit_back_at"] = None
    if j["status"] in ("closed", "expired"):
        a["credit_back_at"] = j["closed_at"]; a["cb_reason"] = "Job ended without a hire"
        a["state"] = "credited_back"
    elif j["status"] == "hired":
        if a["id"] == j["hired_app"]:
            a["state"] = "hired"; a["viewed_at"] = a["viewed_at"] or a["sent"] + dt.timedelta(hours=5)
        elif a["viewed_at"] is None and a["sent"] + dt.timedelta(days=30) <= TODAY:
            a["credit_back_at"] = a["sent"] + dt.timedelta(days=30); a["cb_reason"] = "Unopened for 30 days"; a["state"] = "credited_back"
        else:
            a["state"] = "not_selected"
    else:  # open
        if a["viewed_at"] is None:
            a["state"] = "sent"
        else:
            a["state"] = R.choice(["viewed", "viewed", "shortlisted", "contacted"])

# ---------------------------------------------------------------- direct requests
reqs = []
verified = [p for p in providers if p["status"] == "verified"]
for k in range(150):
    p = R.choices(verified, weights=[0.15 + p["popularity"] ** 1.3 * 2 for p in verified])[0]
    t0 = max(p["verified_at"] + dt.timedelta(hours=6), START + dt.timedelta(days=R.uniform(3, DAYS)))
    if t0 > TODAY: continue
    c = R.choice(posters)
    sub = R.choice(p["subs"])
    r = R.random()
    if t0 + dt.timedelta(days=7) > TODAY and r < 0.25:
        status, resp = "pending", None
    elif r < 0.66:
        status, resp = "approved", t0 + dt.timedelta(hours=R.expovariate(1 / max(1, p["response_hours"])))
    elif r < 0.86:
        status, resp = "declined", t0 + dt.timedelta(hours=R.uniform(1, 48))
    else:
        status, resp = "expired", t0 + dt.timedelta(days=7)
    if resp and resp > TODAY: status, resp = "pending", None
    reqs.append({"id": f"R{len(reqs)+1:04d}", "poster": c["id"], "provider": p["id"], "sub": sub, "sent": t0, "status": status, "responded": resp,
                 "brief": SUBS[sub][2]})

# ---------------------------------------------------------------- credit ledger
events = []  # (time, order, kind, provider, ref)
for p in providers:
    if p["status"] == "verified":
        events.append((p["verified_at"], 0, "welcome", p["id"], p["id"]))
for a in apps:
    events.append((a["sent"], 2, "apply", a["provider"], a["id"]))
    if a["credit_back_at"] and a["credit_back_at"] <= TODAY:
        events.append((a["credit_back_at"], 1, "credit_back", a["provider"], a["id"]))
for q in reqs:
    if q["status"] == "approved":
        events.append((q["responded"], 2, "request", q["provider"], q["id"]))
events.sort(key=lambda e: (e[0], e[1]))

A = {a["id"]: a for a in apps}
Q = {q["id"]: q for q in reqs}
bal = {p["id"]: 0 for p in providers}
ledger = []
purchases = []
def add(t, pid, typ, amount, ref_type, ref, note="", nis=None):
    bal[pid] += amount
    assert bal[pid] >= 0
    ledger.append({"id": f"T{len(ledger)+1:05d}", "at": t, "provider": pid, "type": typ, "amount": amount, "ref_type": ref_type, "ref": ref,
                   "balance_after": bal[pid], "note": note, "nis": nis})

for t, _, kind, pid, ref in events:
    p = P[pid]
    if kind == "welcome":
        add(t, pid, "welcome", WELCOME, "verification", ref, "Welcome credits on verification")
    elif kind == "apply":
        a = A[ref]
        if bal[pid] < APPLY:
            if p["payer"]:
                c_, nis = R.choices(BUNDLES, weights=[3, 4, 1.5])[0]
                bt = t - dt.timedelta(minutes=R.randint(2, 20))
                add(bt, pid, "purchase", c_, "bundle", f"{c_}-credit bundle", f"Bought {c_}-credit bundle", nis)
                purchases.append({"at": bt, "provider": pid, "credits": c_, "nis": nis})
            elif R.random() < 0.55:
                add(t - dt.timedelta(minutes=5), pid, "admin_grant", 50, "support", "beta-grant", "Beta support grant (ops)")
            else:
                a["dropped"] = True
                continue
        add(t, pid, "apply", -APPLY, "application", ref, f"Applied to {J[a['job']]['title']}")
    elif kind == "credit_back":
        a = A[ref]
        if a["dropped"]: continue
        add(t, pid, "credit_back", APPLY, "application", ref, a["cb_reason"])
    elif kind == "request":
        q = Q[ref]
        if bal[pid] < REQ:
            add(t - dt.timedelta(minutes=5), pid, "admin_grant", 20, "support", "beta-grant", "Beta support grant (ops)")
        add(t, pid, "request", -REQ, "direct_request", ref, f"Approved direct request from {C[q['poster']]['name']}")
# a few goodwill grants
for p in R.sample(verified, 6):
    t = max(p["verified_at"], TODAY - dt.timedelta(days=R.randint(1, 20)))
    add(t, p["id"], "admin_grant", 20, "support", "goodwill", "Goodwill grant: feedback champion")

apps = [a for a in apps if not a["dropped"]]
ledger.sort(key=lambda x: x["at"])
# recompute balance_after in time order
run = {p["id"]: 0 for p in providers}
for x in ledger:
    run[x["provider"]] += x["amount"]; x["balance_after"] = run[x["provider"]]
    assert run[x["provider"]] >= 0, x
for p in providers: p["balance"] = run[p["id"]]

# job application counts
for j in jobs:
    j["applicants"] = len([a for a in apps if a["job"] == j["id"]])
    if j.get("hired_app") and j["hired_app"] not in {a["id"] for a in apps}:
        j["status"] = "closed"; j.pop("hired_app")

# ---------------------------------------------------------------- engagements & feedback
engs = []
for j in jobs:
    if j["status"] == "hired":
        a = next(a for a in apps if a["id"] == j["hired_app"])
        engs.append({"id": f"E{len(engs)+1:03d}", "source": "application", "ref": a["id"], "poster": j["poster"], "provider": a["provider"],
                     "at": j["closed_at"], "title": j["title"]})
        C[j["poster"]]["hires"] += 1
    if j["status"] in ("closed", "expired") or j["status"] == "hired":
        C[j["poster"]]["closed"] += 1
for q in reqs:
    if q["status"] == "approved":
        engs.append({"id": f"E{len(engs)+1:03d}", "source": "request", "ref": q["id"], "poster": q["poster"], "provider": q["provider"],
                     "at": q["responded"], "title": q["brief"]})

POS_COMMENTS = ["Arrived on time and did clean work. Will hire again.", "Professional and fast. Explained everything clearly.",
                "Great communication from start to finish.", "Fair price and excellent result.", "Very reliable. Recommended to friends already.",
                "Understood the brief immediately and delivered early.", "Patient, precise and easy to work with.", "Solid work, small delay but kept us updated."]
MID_COMMENTS = ["Good result, took longer than planned.", "Work was fine, communication could be better."]
reviews = []
for e in engs:
    req_t = e["at"] + dt.timedelta(days=3)
    e["feedback"] = {}
    for direction in ("poster_to_provider", "provider_to_poster"):
        if req_t > TODAY:
            e["feedback"][direction] = "not_requested"; continue
        age = (TODAY - req_t).days
        p_submit = 0.55 if age < 7 else (0.82 if age < 14 else 0.95)
        if R.random() < p_submit:
            worked = R.choices(["yes", "no"], weights=[0.86, 0.14])[0]
            sub_t = req_t + dt.timedelta(days=min(age, R.choice([0, 1, 2, 5, 8, 15])))
            rv = {"engagement": e["id"], "direction": direction, "at": sub_t, "worked": worked}
            if worked == "yes":
                o = R.choices([5, 4, 3, 2], weights=[0.62, 0.28, 0.08, 0.02])[0]
                rv["overall"] = o
                rv["comment"] = (R.choice(POS_COMMENTS) if o >= 4 else R.choice(MID_COMMENTS)) if R.random() < 0.7 else ""
            else:
                rv["no_reason"] = R.choice(["The other side didn't respond", "Price", "Availability", "Not a fit"])
            reviews.append(rv); e["feedback"][direction] = "submitted"
        else:
            e["feedback"][direction] = "overdue" if age >= 14 else "pending"
# blind reveal: both submitted, or 14 days after first
for e in engs:
    rvs = [r for r in reviews if r["engagement"] == e["id"]]
    for r in rvs:
        both = len(rvs) == 2
        r["revealed"] = both or (TODAY - r["at"]).days >= 14
    e["blocked_risk"] = any(v == "overdue" for v in e["feedback"].values())

for p in providers:
    rs = [r for r in reviews if r["direction"] == "poster_to_provider" and r.get("overall") and r["revealed"]
          and next(e for e in engs if e["id"] == r["engagement"])["provider"] == p["id"]]
    p["review_count"] = len(rs)
    p["rating"] = round(sum(r["overall"] for r in rs) / len(rs), 1) if rs else None
    p["reviews"] = [{"stars": r["overall"], "comment": r["comment"], "at": iso(r["at"]),
                     "by": C[next(e for e in engs if e["id"] == r["engagement"])["poster"]]["name"]} for r in rs if r.get("comment")][:4]
    p["jobs_done"] = len([e for e in engs if e["provider"] == p["id"]])
for c in posters:
    rs = [r for r in reviews if r["direction"] == "provider_to_poster" and r.get("overall") and r["revealed"]
          and next(e for e in engs if e["id"] == r["engagement"])["poster"] == c["id"]]
    c["rating_count"] = len(rs); c["rating"] = round(sum(r["overall"] for r in rs) / len(rs), 1) if rs else None
    c["hire_rate"] = round(c["hires"] / c["closed"] * 100) if c["closed"] else None
    del c["closed"]

# ---------------------------------------------------------------- serialize
def clean(o):
    if isinstance(o, dt.datetime): return iso(o)
    if isinstance(o, dict): return {k: clean(v) for k, v in o.items() if k not in ("popularity", "payer", "activity", "dropped")}
    if isinstance(o, list): return [clean(v) for v in o]
    return o

data = {
    "meta": {"today": iso(TODAY), "start": iso(START), "welcome": WELCOME, "apply": APPLY, "request": REQ,
             "bundles": [{"credits": c, "nis": n} for c, n in BUNDLES]},
    "taxonomy": {c: [s for s, v in SUBS.items() if v[0] == c] for c in CATS},
    "budget_mandatory": sorted(BUDGET_MANDATORY),
    "providers": clean(providers), "posters": clean(posters), "jobs": clean(jobs), "applications": clean(apps),
    "requests": clean(reqs), "engagements": clean(engs), "reviews": clean(reviews), "ledger": clean(ledger),
}
os.makedirs("out", exist_ok=True)
with open("out/joby_demo_data.json", "w") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

# CSV exports
def wcsv(name, rows, cols):
    with open(f"out/{name}", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(cols)
        for r in rows: w.writerow([r.get(c) if not isinstance(r.get(c), list) else "; ".join(map(str, r.get(c))) for c in cols])

wcsv("joby_providers.csv", data["providers"], ["id", "first", "last", "type", "status", "city", "region", "category", "subs", "headline", "skills",
     "years", "days_band", "remote", "onsite", "radius", "signup", "verified_at", "balance", "rating", "review_count", "jobs_done", "partner_id", "license"])
jrows = [dict(j, poster_name=C[j["poster"]]["name"], budget_type=(j["budget"] or {}).get("type", "open to quotes"),
              budget_min=(j["budget"] or {}).get("min"), budget_max=(j["budget"] or {}).get("max")) for j in data["jobs"]]
wcsv("joby_jobs.csv", jrows, ["id", "title", "category", "sub", "mode", "city", "poster", "poster_name", "budget_type", "budget_min", "budget_max",
     "timeline", "posted", "status", "applicants", "closed_at"])
wcsv("joby_credit_ledger.csv", data["ledger"], ["id", "at", "provider", "type", "amount", "balance_after", "ref_type", "ref", "note", "nis"])

# summary
from collections import Counter
print("providers", len(providers), Counter(p["status"] for p in providers), Counter(p["type"] for p in providers))
print("jobs", len(jobs), Counter(j["status"] for j in jobs), Counter(j["category"] for j in jobs))
print("apps", len(apps), "reqs", len(reqs), Counter(q["status"] for q in reqs), "engs", len(engs), "reviews", len(reviews))
tot = Counter()
for x in ledger: tot[x["type"]] += x["amount"]
print("ledger", dict(tot), "outstanding", sum(p["balance"] for p in providers))
print("purchases", len(purchases), "revenue", sum(x["nis"] for x in purchases))
print("rated providers (3+)", len([p for p in providers if p["review_count"] >= 3]))
print("size", os.path.getsize("out/joby_demo_data.json"))
