# Pixie Money Coach

A modern AI-powered money coaching application with a Vite + Tailwind frontend and Flask + LLM backend.

## Project Structure

```
mockup/
├── backend/              # Flask server for LLM processing
│   ├── app.py           # Main Flask application
│   ├── requirements.txt # Python dependencies
│   ├── .env.example     # Environment variables template
│   └── README.md        # Backend-specific documentation
├── src/                 # Frontend JavaScript modules
├── assets/              # Images and static files
├── index.html           # Main HTML file
├── package.json         # Node.js dependencies
└── vite.config.js       # Vite configuration
```

## Prerequisites

Before you begin, you need to have Node.js and npm (Node Package Manager) installed on your system.

### Installing Node.js and npm

#### Windows

1. **Download Node.js:**
   - Visit [https://nodejs.org/](https://nodejs.org/)
   - Download the LTS (Long Term Support) version for Windows
   - Run the installer (.msi file)

2. **Follow the installer:**
   - Accept the license agreement
   - Choose the installation path
   - Make sure "npm package manager" is checked
   - Click "Install"

3. **Verify installation:**
   Open PowerShell or Command Prompt and run:
   ```powershell
   node --version
   npm --version
   ```

#### macOS

**Option 1: Using the Official Installer**
1. Visit [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS version for macOS
3. Run the installer and follow the prompts
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**Option 2: Using Homebrew (Recommended)**
1. If you don't have Homebrew, install it from [https://brew.sh/](https://brew.sh/)
2. Install Node.js:
   ```bash
   brew install node
   ```
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### Linux

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node --version
npm --version
```

**For the latest version, use NodeSource repository:**
```bash
# Install curl if not already installed
sudo apt install curl

# Add NodeSource repository (for Node.js 20.x LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install nodejs

# Verify installation
node --version
npm --version
```

**Fedora/RHEL/CentOS:**
```bash
# Using dnf
sudo dnf install nodejs npm

# Verify installation
node --version
npm --version
```

**Arch Linux:**
```bash
# Using pacman
sudo pacman -S nodejs npm

# Verify installation
node --version
npm --version
```

## Project Setup

Once you have Node.js and npm installed, follow these steps to set up the project:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mockup
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- Vite (build tool and dev server)
- Tailwind CSS (utility-first CSS framework)
- PostCSS and Autoprefixer (CSS processing)

### 3. Run the Development Server

Start the development server with hot-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use). The exact URL will be displayed in the terminal.

The dev server features:
- Hot Module Replacement (HMR) - instant updates without full page reload
- Fast startup and updates
- Built-in error overlay

### 4. Build for Production

Create an optimized production build:

```bash
npm run build
```

The production files will be generated in the `dist/` directory.

### 5. Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

This will serve the built files from the `dist/` directory.

## Project Structure

```
mockup/
├── src/
│   ├── challenge.js      # Challenge-related functionality
│   ├── chat.js          # Chat functionality
│   ├── dashboard.js     # Dashboard logic
│   ├── main.js          # Main entry point
│   ├── navigation.js    # Navigation handling
│   ├── onboarding.js    # Onboarding flow
│   ├── state.js         # State management
│   └── styles.css       # Global styles with Tailwind
├── index.html           # Main HTML file
├── package.json         # Project dependencies and scripts
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── postcss.config.js    # PostCSS configuration
```

## Available Scripts

### Frontend (Vite)
- `npm run dev` - Start development server on http://localhost:5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Backend (Flask)
See [backend/README.md](backend/README.md) for detailed backend setup instructions.

Quick start:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python app.py
```

Backend will run on http://localhost:5000

## Technology Stack

### Frontend
- **Vite** - Next-generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - Modular ES6+ JavaScript

### Backend
- **Flask** - Python web framework
- **Flask-CORS** - Cross-Origin Resource Sharing support
- **LLM Integration** - OpenAI, Anthropic, or other LLM providers (to be implemented)

## Development Workflow

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```

2. In a separate terminal, start the frontend:
   ```bash
   npm run dev
   ```

3. Access the application at http://localhost:5173

The frontend will make API calls to the backend at http://localhost:5000 for LLM-powered features.

## Notes

- The original single-file HTML was migrated to Vite for better development experience
- Tailwind is now compiled (no CDN) for optimized production builds
- The original inline JS was split into small modules under `src/` for better maintainability
- To avoid changing the HTML, existing `onclick=""` handlers still work via functions exposed on `window`
- Backend API endpoints will be implemented to handle LLM logic for chat, challenges, and budget suggestions

## Troubleshooting

**Port already in use:**
If port 5173 is already in use, Vite will automatically try the next available port.

**Module not found errors:**
Make sure you've run `npm install` to install all dependencies.

**Permission errors on Linux/macOS:**
If you encounter permission errors when installing packages globally, consider using [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) instead of installing Node.js system-wide.

## License

[Specify your license here]
