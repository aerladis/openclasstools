# Design Specification: Modern ELT Game Prompt Enhancements

**Date**: 2026-08-05  
**Author**: AI Pair Programmer  
**Status**: Proposal for Review  

---

## 1. Overview & Pedagogical Objectives

This document details the enhancements to OpenClassTools AI game generation prompts (`prompts.json` and `server.js` fallback generators) to align with modern English Language Teaching (ELT) methodologies from **Cambridge University Press & Assessment (CELTA/Delta frameworks)** and **Pearson Global Scale of English (GSE / CEFR Companion Volume 2020)**.

### Core Goals:
1. **Eliminate Artificial/Forced Phrasing**: Prevent AI models from creating exaggerated, unnatural sentences just to force a topic keyword (e.g., preventing *"I am an astronaut eating space pizza on a space shuttle"*).
2. **Strict Zero-Leak Circumlocution**: Guarantee clues and prompts in `scramble`, `riddle`, `kelime`, and `taboo` never reveal target words, root stems, or morphological derivatives (e.g., preventing target word `RUNNER` with clue `A person who runs`).
3. **Task-Based Language Teaching (TBLT)**: Structure roleplays and dialogues around authentic communicative functions (negotiation, advice, requests, expressing doubt) rather than generic monologues.
4. **Natural Conversational Ordering**: Mandate strict 2-speaker dialogues ($A \rightarrow B \rightarrow A$) with logical conversational coherence for dialogue-ordering challenges.
5. **Authentic Spoken Phonology & Grammar**: Refine pronunciation challenges to target focus stress, contrastive stress, and connected speech instead of absurd tongue-twisters, and target authentic CEFR errors in grammar.

---

## 2. Theoretical ELT Justifications

| Modern ELT Principle | Theoretical Source | Implementation in Prompts |
| :--- | :--- | :--- |
| **Communicative Competence & TBLT** | Willis & Willis (*Task-Based Learning*); Nunan | Scenarios require functional communicative goals (information/opinion gap) rather than rote repetition. |
| **Circumlocution Strategies** | Dörnyei (*Strategic Competence*); Nation | Clues use relative clauses (`A person who...`, `A tool used for...`) with strict prohibition of root words. |
| **Authentic Phonology & Stress** | Roach (*English Phonetics and Phonology*) | Spoken prompts focus on sentence stress, intonation, and linking rather than artificial tongue-twisters. |
| **Conversation Analysis (IRF)** | Sinclair & Coulthard; Schegloff | Dialogue ordering strictly follows 2-speaker initiation-response-follow-up sequences ($A: Q \rightarrow B: A \rightarrow A: R$). |
| **CEFR & GSE Function Alignment** | Council of Europe (2020); Pearson GSE | Grammar items target specific CEFR functional structures with clear `[___]` blanks or realistic error corrections. |

---

## 3. Detailed Prompt Enhancements

### 3.1 `prompts.json` Enhancements

#### A. Global Authenticity & Zero-Leak Directives
Every prompt template will include:
* **AUTHENTICITY DIRECTIVE**: *"Language MUST sound like natural, idiomatic English spoken in real life. NEVER force the theme word artificially into every sentence or create absurd, exaggerated scenarios."*
* **ZERO-LEAK DIRECTIVE**: *"NEVER state, spell, or leak the answer inside the prompt, clue, or scrambled word. Prohibit target words, root stems, and morphological variations (e.g., if answer is 'RUNNER', do NOT use 'run' or 'running' in the clue)."*

#### B. Category-Specific Refinements for `lingoparty`

1. **`riddle`**:
   * *Formula*: Functional description targeting purpose, location, cause/effect, or key characteristics without naming the target concept or its root stem.
2. **`scramble`**:
   * *Formula*: Clear, concise dictionary-style or contextual clue using relative clauses (e.g. `A device used for measuring temperature...`).
3. **`pronunciation`**:
   * *Formula*: Natural, meaningful sentence demonstrating key sentence stress, contrastive stress, or intonation (e.g., polite request or expressing surprise). Focus stress words listed in answer.
4. **`association`**:
   * *Formula*: Clear instruction to name 3 specific related collocations, action verbs, or phrasal verbs tied naturally to the topic.
5. **`grammar`**:
   * *Formula*: Sentence targeting a CEFR-scaled grammar concept (tenses, modals, prepositions, articles, conditionals) containing a realistic error to correct or a single `[___]` blank.
6. **`speed`**:
   * *Formula*: 15-second rapid authentic communicative recall question (e.g., *"Name 3 things you would say when arriving at a hotel check-in"*).
7. **`roleplay`**:
   * *Formula*: Realistic solo or partner communicative scenario with a specific role, goal, and target functional language (e.g. *"You are returning a broken item to a store. Politely explain the problem and ask for a refund"*).
8. **`ordering`**:
   * *Formula*: Exactly 3 lines of natural dialogue strictly between 2 speakers ($A$ and $B$). Format in prompt must be 3 jumbled lines (`B: ...\nA: ...\nB: ...`), and answer must be the logically correct flow (`A: ... -> B: ... -> B: ...` or `A: ... -> B: ... -> A: ...`).

#### C. Other Games (`taboo`, `kelime`, `millionaire`, `hangman`, `flashcards`)

* **`taboo`**: Forbidden words must include the core category/defining words to force advanced circumlocution strategies.
* **`kelime`**: Strict prohibition of root words or stems in clues.
* **`millionaire`**: Questions must be clear, factual, engaging, and systematically progress across Easy (Q1-5), Medium (Q6-10), and Hard (Q11-15).

---

## 4. Server Fallback Generator Synchronization (`server.js`)

The `createFallbackQuestions` function in `server.js` will be updated to reflect the exact same ELT principles, ensuring offline play and fallback generation adhere to high naturalness and zero-leak standards.

---

## 5. Verification & Testing Plan

1. **Automated Unit Tests**:
   * Run existing deck validation tests (`npm test`) to ensure all generated/updated schema formats pass.
2. **Live AI Generation Audit Script**:
   * Create/run a verification script to generate decks for various topics (*"Space Exploration"*, *"Business Meeting"*, *"Travel & Hotel"*) using the active provider.
   * Verify generated JSON for:
     - Zero root word leaking.
     - Natural, un-forced English phrasing.
     - 2-speaker dialogue ordering integrity.
     - Correct category schemas.

---

## User Review

Please review this design specification. Once approved, I will proceed to write the step-by-step implementation plan.
