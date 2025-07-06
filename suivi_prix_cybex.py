# app.py
import streamlit as st
import pandas as pd
import datetime
import requests
from bs4 import BeautifulSoup
import os
import re
import time
import plotly.express as px

st.set_page_config(page_title="Suivi Cybex", layout="wide")

st.markdown("""
    <style>
    .block-container {
        padding-top: 2rem;
    }
    table td {
        font-size: 14px;
    }
    </style>
""", unsafe_allow_html=True)

st.title("Suivi des prix - Poussettes Cybex")
monnaie_affichage = st.selectbox("Afficher les prix convertis en :", ["EUR", "CHF", "USD"])

SCRAPE_INTERVAL_HEURES = 12
TIMESTAMP_FILE = "last_scrape_timestamp.txt"

# Chargement de l'historique existant
csv_path = "historique_prix.csv"
colonnes = ["date", "modele", "site", "pays", "prix_ttc", "prix_ht", "devise", "lien"]
df = pd.read_csv(csv_path) if os.path.exists(csv_path) and os.path.getsize(csv_path) > 0 else pd.DataFrame(columns=colonnes)

def should_scrape():
    if not os.path.exists(TIMESTAMP_FILE):
        return True
    with open(TIMESTAMP_FILE, "r") as f:
        last_timestamp = float(f.read())
    return (time.time() - last_timestamp) >= SCRAPE_INTERVAL_HEURES * 3600

def update_timestamp():
    with open(TIMESTAMP_FILE, "w") as f:
        f.write(str(time.time()))

urls = {
    "Cybex Priam": {
        "France": "https://www.amazon.fr/dp/B096VFCT8M",
        "Suisse": "https://www.galaxus.ch/fr/s6/product/cybex-priam-seat-pack-we-the-baby-poussette-21401969",
        "Allemagne": "https://www.amazon.de/dp/B096VFCT8M",
        "Italie": "https://www.amazon.it/dp/B096VFCT8M",
        "USA": "https://www.cybex-online.com/en/us/p/ST_PL_Priam_La_Parisienne_US.html"
    },
    "Cybex Gazelle S": {
        "France": "https://www.amazon.fr/dp/B0BMTV1Z33",
        "Suisse": "https://www.manor.ch/fr/p/p0-21122701",
        "Allemagne": "https://www.amazon.de/dp/B0BMTV1Z33",
        "Italie": "https://www.amazon.it/dp/B0BMTV1Z33",
        "USA": "https://www.cybex-online.com/en/us/strollers/full-size-strollers/?...Gazelle%20S"
    }
}

def get_price(url):
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        if "amazon" in url:
            price_tag = soup.select_one("#priceblock_ourprice") or soup.select_one("#priceblock_dealprice") or soup.select_one(".a-price .a-offscreen")
        elif "galaxus" in url:
            price_tag = soup.select_one(".product__price")
        elif "manor.ch" in url:
            price_tag = soup.select_one(".m-buybox__price")
        elif "cybex-online.com" in url:
            price_tag = soup.select_one(".product-price") or soup.find("span", class_=re.compile("price"))
        else:
            price_tag = soup.find("span")

        if price_tag:
            price_text = price_tag.get_text().replace("\xa0", " ").strip()
            return price_text
    except Exception:
        return None

def extraire_site(url):
    try:
        return url.split("/")[2]
    except IndexError:
        return "N/A"

# Taux de change fixes
# Base CHF = 1.0
rates = {
    "CHF": 1.0,
    "EUR": 1/1.07,    # 1 CHF = 1.07 EUR, donc 1 EUR = ~0.9346 CHF => stored as CHF base inverse
    "USD": 1/1.26     # 1 CHF = 1.26 USD, donc 1 USD = ~0.7937 CHF
}

# Pour conversion, on convertit d'abord montant vers CHF, puis vers devise cible

def convertir(montant, devise_origine, devise_cible):
    try:
        # Convertir montant en CHF
        if devise_origine == "CHF":
            montant_chf = montant
        elif devise_origine == "EUR":
            montant_chf = montant / (1/1.07)  # montant / taux = montant * 1.07
        elif devise_origine == "USD":
            montant_chf = montant / (1/1.26)  # montant * 1.26
        else:
            # devise inconnue, retour montant brut
            return montant

        # Convertir CHF vers devise cible
        if devise_cible == "CHF":
            return round(montant_chf, 2)
        elif devise_cible == "EUR":
            return round(montant_chf * (1/1.07), 2)
        elif devise_cible == "USD":
            return round(montant_chf * (1/1.26), 2)
        else:
            return round(montant_chf, 2)
    except Exception:
        return None

mettre_a_jour = st.button("🔄 Mettre à jour maintenant")
autorise_scraping = should_scrape() or mettre_a_jour

if autorise_scraping:
    data = []
    aujourdhui = datetime.date.today().isoformat()
    for modele, pays_urls in urls.items():
        for pays, lien in pays_urls.items():
            prix = get_price(lien)
            if prix:
                # Définir devise selon pays
                if pays == "Suisse":
                    devise = "CHF"
                elif pays == "USA":
                    devise = "USD"
                else:
                    devise = "EUR"

                try:
                    montant = float(re.sub(r"[^0-9.,]", "", prix).replace(",", "."))
                    # TVA selon pays
                    tva = 0.2 if pays in ["France", "Allemagne", "Italie"] else 0.077 if pays == "Suisse" else 0.0
                    montant_ht = montant / (1 + tva) if tva > 0 else montant
                    data.append({
                        "date": aujourdhui,
                        "modele": modele,
                        "site": extraire_site(lien),
                        "pays": pays,
                        "prix_ttc": round(montant, 2),
                        "prix_ht": round(montant_ht, 2),
                        "devise": devise,
                        "lien": lien
                    })
                except ValueError:
                    continue
    if data:
        nouv_df = pd.DataFrame(data, columns=colonnes)
        df = pd.concat([df, nouv_df], ignore_index=True).drop_duplicates()
        df.to_csv(csv_path, index=False)
        update_timestamp()

if not df.empty:
    taux_affichage = monnaie_affichage

    df[f"prix_ttc_{monnaie_affichage.lower()}"] = df.apply(
        lambda row: convertir(row["prix_ttc"], row["devise"], monnaie_affichage), axis=1
    )
    df[f"prix_ht_{monnaie_affichage.lower()}"] = df.apply(
        lambda row: convertir(row["prix_ht"], row["devise"], monnaie_affichage), axis=1
    )
else:
    st.error("Pas de données disponibles.")

if not df.empty:
    df["Acheter"] = df["lien"].apply(lambda x: f"[🔗 Lien]({x})")
    df_affichage = df.drop(columns=["lien"])
    st.subheader("📊 Tableau des prix")
    st.dataframe(df_affichage)

    csv_export = df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Télécharger les données CSV", csv_export, "prix_cybex.csv", "text/csv")

    st.subheader("📈 Historique des prix")
    modele_selection = st.selectbox("Choisir un modèle à afficher :", df["modele"].unique())
    df_modele = df[df["modele"] == modele_selection]

    fig = px.line(
        df_modele,
        x="date",
        y=f"prix_ttc_{monnaie_affichage.lower()}",
        color="pays",
        markers=True,
        title=f"Évolution du prix TTC ({monnaie_affichage}) pour {modele_selection}"
    )
    st.plotly_chart(fig)

    st.subheader("💡 Opportunités d'arbitrage")
    resultats = []
    modeles = df["modele"].unique()

    for modele in modeles:
        sous_df = df[df["modele"] == modele].sort_values(f"prix_ttc_{monnaie_affichage.lower()}")
        if len(sous_df) >= 2:
            meilleur = sous_df.iloc[0]
            pire = sous_df.iloc[-1]
            ecart = pire[f"prix_ttc_{monnaie_aff
