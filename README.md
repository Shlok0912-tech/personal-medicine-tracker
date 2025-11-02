# Meditrack

A modern health tracking application for managing medicines and glucose levels with Google Sheets integration.

## Features

- **Medicine Inventory Management**: Add, edit, and track your medicine stock
- **Medicine Intake Logging**: Record when you take your medicines
- **Glucose Level Tracking**: Monitor and log your blood glucose readings
- **Real-time Sync**: Data updates in real-time across all devices
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Technologies Used

This project is built with:

- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn/ui** - Beautiful, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn


### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd tablet-tally-time-main
```

2. Install dependencies:
```bash
npm install
```

3. Set up Google Sheets integration:
   - Follow the instructions in `GOOGLE_SHEETS_SETUP.md`
   - Configure your `.env` file with your Google Sheets API key

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:8080`

## Google Sheets Setup

This application uses Google Sheets as the data storage backend. Please refer to `GOOGLE_SHEETS_SETUP.md` for detailed setup instructions.

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── AddGlucoseDialog.tsx
│   ├── AddMedicineDialog.tsx
│   ├── GlucoseCard.tsx
│   ├── HistoryTab.tsx
│   ├── MedicineCard.tsx
│   └── TakeMedicineDialog.tsx
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and services
│   ├── googleSheets.ts # Google Sheets API service
│   ├── storage.ts      # Data storage abstraction
│   └── utils.ts        # Utility functions
├── pages/              # Page components
│   ├── Index.tsx       # Main application page
│   └── NotFound.tsx    # 404 page
└── main.tsx           # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).
