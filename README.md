# rfe-api-test-demo

> Framework de tests API — Réforme de la Facturation Électronique (RFE)  
> TypeScript · Cucumber/Gherkin · Axios · Mock Server Express · CI/CD GitHub Actions

---

## Contexte

Ce projet démontre une approche complète de tests API BDD dans le cadre de la
Réforme de la Facturation Électronique (RFE), imposée aux entreprises assujetties
à la TVA. Il couvre les deux périmètres principaux :

- **Flux d'émission** — création, validation et soumission de factures B2B
- **Flux de réception** — consultation, accusé de réception, rejet

---

## Stack technique

| Composant       | Outil                        |
|-----------------|------------------------------|
| Langage         | TypeScript 5.x               |
| Framework BDD   | Cucumber.js + Gherkin        |
| Client HTTP     | Axios                        |
| Validation      | AJV (JSON Schema)            |
| Mock server     | Express                      |
| Reporting       | JSON (compatible Jira Xray)  |
| CI/CD           | GitHub Actions               |

---

## Structure

features/
emission/emission_facture.feature    # 5 scénarios — flux émission
reception/reception_facture.feature  # 6 scénarios — flux réception
src/
steps/
emission.steps.ts                  # Step definitions émission
reception.steps.ts                 # Step definitions réception
support/
api-client.ts                      # Client HTTP Axios
mock-server.ts                     # API RFE simulée (Express)
hooks.ts                           # BeforeAll / AfterAll / Before
world.ts                           # Cucumber World + JSON Schema

---

## Lancement

```bash
npm install
npm test                        # tous les tests
npm run test:smoke              # smoke tests uniquement
npm run test:emission           # flux émission
npm run test:reception          # flux réception
```

Résultat attendu :

14 scenarios (14 passed)
92 steps (92 passed)

---

## Intégration Jira Xray

Les scénarios sont tagués pour liaison directe avec Jira Xray :

```gherkin
@emission @JIRA-RFE-101
Scenario: Émission d'une facture standard B2B valide
```

Le fichier `reports/cucumber-report.json` généré après `npm test`
peut être importé dans Xray via l'API ou le plugin CI.

---

**Auteur :** N'Koy OTSHUDI — QA Senior · ISTQB CTFL  
[nkoyotshudi.fr](https://nkoyotshudi.fr) · [github.com/otshudi-n-koy](https://github.com/otshudi-n-koy)