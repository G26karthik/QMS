# Interactive Question Management Sheet

A React-based web application for managing coding questions organized by topics and sub-topics. This is my solution for the "Interactive Question Management Sheet" take-home assignment.

## Features Implemented

### Core Features
- **Topics**: Add, edit, and delete topics
- **Sub-topics**: Add, edit, and delete sub-topics under each topic
- **Questions**: Add, edit, and delete questions under each sub-topic
- **Drag-and-Drop**: Reorder topics, sub-topics, and questions by dragging
- **Expand/Collapse**: Expand or collapse all sections with one click

### Bonus Features
- **Search**: Search questions by title
- **Difficulty Filter**: Filter questions by difficulty (Easy, Medium, Hard)

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Drag and Drop**: @dnd-kit
- **Icons**: Lucide React

## Data Handling

- Initial data is fetched from the provided public API:
  `https://node.codolio.com/api/question-tracker/v1/sheet/public/get-sheet-by-slug/striver-sde-sheet`
- If the API data is not available or unusable, the app automatically uses sample data
- All add, edit, and delete operations work on the frontend only (changes are not saved to a server)

## Assumptions

- This is a single-page web application
- Frontend-only assignment (no backend or database)
- Designed for desktop browsers with basic tablet support
- Data does not persist after page refresh

## How to Run

1. Make sure you have Node.js installed (v18 or higher recommended)

2. Clone or download this project

3. Open a terminal in the `question-sheet` folder

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and go to the URL shown in the terminal (usually http://localhost:5173)

## Project Structure

```
src/
├── components/     # UI components (Header, TopicSection, etc.)
├── data/           # Sample/mock data
├── hooks/          # Custom React hooks
├── store/          # Zustand store for state management
├── types/          # TypeScript type definitions
└── utils/          # Helper functions
```
