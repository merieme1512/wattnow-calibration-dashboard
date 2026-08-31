# ⚡ Wattnow — Dashboard de Calibration Triphasée (V2)

Un tableau de bord web moderne et interactif développé avec **Angular 22** et **TailwindCSS** pour la calibration métrologique et le test usine des analyseurs d'énergie triphasés Wattnow (1 ADE & Multi-départ 5 ADE).

![Angular](https://img.shields.io/badge/Angular-22-dd0031?style=for-the-badge&logo=angular)
![MQTT](https://img.shields.io/badge/MQTT-EMQX%20WebSocket-660099?style=for-the-badge&logo=mqtt)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 🌟 Fonctionnalités Principales

* 📊 **Surveillance Temps Réel Multi-équipements (5 Slots)** : Visualisation simultanée des métriques de tension ($V_A, V_B, V_C$), courant ($I_A, I_B, I_C$), puissance active ($P_A, P_B, P_C$), $\cos \varphi$, fréquence et RSSI avec jauges semi-circulaires 180°.
* 🔌 **Connexion MQTT & Simulateur Intégré** : Support du protocole WebSocket MQTT (`broker.emqx.io:8083`) ainsi qu'un simulateur de télémesures et trames `DIAG ADE` autonome pour les démonstrations.
* ⚡ **Prise en charge des Bancs de Test CT** :
  * Onglet **`10A CTs`** (Banc 10A / 230V) : Modèles `CT_600A`, `CT_200A`, `CT_5A`.
  * Onglet **`1000A CTs`** (Banc 100A / 230V) : Modèles `CT_1000A`, `CT_2000A`, `CT_4000A`, `CT_RCG` (Rogowski).
* 🔒 **Verrouillage de Sécurité & Validation Baseline** :
  * Commande `VALIDATE CALIB` (`DIAG ADE`) obligatoire pour débloquer les boutons de calibration métrologique.
  * Verrouillage automatique en cas de courant hors plage tolérée ([9.5A – 10.5A] ou [99.5A – 100.5A]).
* 🛠️ **Commandes de Calibration Métier** :
  * `U_I_CALIB` (Tension/Courant sous $\cos \varphi \approx 1.0$)
  * `PHASE_CALIB` (Angle de phase sous $\cos \varphi \approx 0.5$)
  * `POWER_CALIB` (Puissance active sous $\cos \varphi \approx 1.0$)
  * `RESET NVM` (Réinitialisation usine des registres ADE)
* ⏱️ **Indicateur de Fréquence d'Envoi** : Sélection de cadence 5s ou 10s avec compteur temps réel *Live* d'intervalle écoulé.
* 📜 **Exportation de Rapport & Certificat PDF Officiel** :
  * Exportation des données brutes de télémesure (`.json`) avec `SAVE DATA`.
  * Exportation des registres d'usine `DIAG ADE` (`.json`) avec `SAVE LOG`.
  * Génération et téléchargement du **Certificat de Calibration Officiel PDF** certifiant le résultat `PASS ✓` ou `FAIL ✗` par numéro de série.

---

## 🚀 Installation & Démarrage Rapide

### Prérequis

* [Node.js](https://nodejs.org/) (Version `>= 18.x`)
* [npm](https://www.npmjs.com/) (fourni avec Node.js)

### 1. Cloner le projet

```bash
git clone https://github.com/merieme1512/wattnow-calibration-dashboard.git
cd wattnow-calibration-dashboard
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Lancer l'application en serveur de développement

```bash
npm start
```
*ou directement via Angular CLI :*
```bash
npx ng serve
```

### 4. Accéder à l'application

Ouvrez votre navigateur web et accédez à :
👉 **[http://localhost:4200/](http://localhost:4200/)**

---

## 📂 Structure du Projet

```text
src/
├── app/
│   ├── components/
│   │   ├── control-panel/    # Barre supérieure de contrôle
│   │   ├── device-card/      # Carte d'appareil avec jauges semi-circulaires
│   │   ├── gauge-grid/       # Grille des 5 emplacements d'analyseurs
│   │   ├── header/           # En-tête avec statut Broker & Mode Simulateur
│   │   ├── report-pdf/       # Modal du Certificat Officiel PDF
│   │   └── right-sidebar/    # Barre latérale (SN, CT, Calibration, PDF)
│   ├── models/               # Types & Interfaces TypeScript (Calibration, Telemetry)
│   ├── services/             # MQTT, Etat Global Calibration & Simulateur
│   └── utils/                # Utilitaires de validation métrologique
```

---

## 📜 Licence

Ce projet est sous licence **MIT** - Libre d'accès, d'utilisation et de distribution.
