# MediGuard AI

Digital Health Record Management System for migrant workers (Smart India Hackathon, SIH25083).

## Features
- Register migrant workers
- Add and view health records (checkup, vaccination, illness, medication, lab test)
- QR health card for each worker

## Tech stack
React (Vite) + Node.js/Express. Data is stored in local JSON files (`backend/data/`).

## Run on localhost
Requires Node.js 20+. Use two terminals.

Backend (http://localhost:5000):

    cd backend
    npm install
    npm run dev

Frontend (http://localhost:5173):

    cd frontend
    npm install
    npm run dev

Open the frontend link in your browser.