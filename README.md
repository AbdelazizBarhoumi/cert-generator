# Certificate Generator - Automated Certificate Creation System

A powerful web application for bulk generation of certificates, ID cards, and PDF documents. Upload your template, position text fields visually, import data from CSV/Excel, and download personalized documents in seconds.

## ✨ Features

### Certificate Generator
- Upload PDF or image templates (PDF, PNG, JPG)
- Visual drag-and-drop text field positioning
- Live preview with real-time font customization
- Support for name, ID, and unlimited custom fields
- Bulk generation from CSV/Excel data
- Download all certificates as a ZIP file

### ID Card Maker
- Preset card sizes (Credit Card, CR80, Business Card, A7)
- Custom dimension support
- Multiple output formats:
  - Individual PDF files (ZIP)
  - Single PDF with one card per page
  - Grid layout (multiple cards per page)
- Perfect for employee badges, membership cards, event passes

### PDF Editor
- Add text fields to any PDF document
- Full font customization (family, size, weight, color, alignment)
- Support for custom font uploads
- Direct PDF export

### General Features
- **No signup required** - Start creating immediately
- **Unlimited documents** - No generation limits
- **Client-side processing** - Your data stays private
- **Modern UI** - Clean, intuitive wizard-based interface
- **Live preview** - See changes instantly as you customize

## 🛠️ Tech Stack

- **Backend:** PHP 8.2+, Laravel 12
- **Frontend:** React 19, TypeScript, Vite 7
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI, shadcn/ui patterns
- **PDF Processing:** pdf-lib, pdfjs-dist
- **Data Handling:** xlsx (Excel/CSV parsing), JSZip, FileSaver
- **State Management:** React Query, React Hook Form
- **Charts:** Recharts

## 📋 Requirements

- PHP 8.2 or higher
- Composer 2.x
- Node.js 18+ and npm
- SQLite (default) or MySQL/PostgreSQL

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cert-generator.git
   cd cert-generator
   ```

2. **Run the setup script**
   ```bash
   composer setup
   ```
   This will:
   - Install PHP dependencies
   - Create `.env` file from `.env.example`
   - Generate application key
   - Run database migrations
   - Install npm dependencies
   - Build frontend assets

3. **Or install manually**
   ```bash
   # Install PHP dependencies
   composer install

   # Copy environment file
   cp .env.example .env

   # Generate application key
   php artisan key:generate

   # Run migrations
   php artisan migrate

   # Install npm dependencies
   npm install

   # Build assets
   npm run build
   ```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```env
APP_NAME="Certificate Generator"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
# Or configure MySQL/PostgreSQL:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=cert_generator
# DB_USERNAME=root
# DB_PASSWORD=
```

## 💻 Usage

### Development Server

Start the development server with all services:

```bash
composer dev
```

This starts concurrently:
- Laravel development server
- Queue worker
- Log viewer (Pail)
- Vite dev server with HMR

Then open http://localhost:8000 in your browser.

### Production Build

```bash
npm run build
php artisan serve
```

### Running Tests

```bash
composer test
```

## 📖 How to Use

### Creating Certificates

1. **Upload Template** - Upload your certificate design (PDF or image)
2. **Position Fields** - Click "Draw Area" and drag on the template to position text fields
3. **Customize Fonts** - Adjust font family, size, weight, color, and alignment
4. **Import Data** - Upload a CSV/Excel file with columns: `name`, `id` (optional), and any custom fields
5. **Generate** - Click generate and download your certificates as a ZIP file

### Creating ID Cards

1. **Select Card Size** - Choose from presets or enter custom dimensions
2. **Upload Design** - Upload your ID card template
3. **Position Fields** - Place name, ID, and custom fields
4. **Import Data** - Upload recipient data
5. **Choose Output** - Select individual files, single PDF, or grid layout
6. **Generate** - Download your ID cards

### CSV/Excel Format

Your data file should have at minimum a `name` column:

| name | id | department | title |
|------|-----|------------|-------|
| John Doe | EMP001 | Engineering | Developer |
| Jane Smith | EMP002 | Marketing | Manager |

## 📁 Project Structure

```
cert-generator/
├── app/                    # Laravel application
│   ├── Http/Controllers/   # HTTP controllers
│   └── Models/             # Eloquent models
├── resources/
│   ├── js/                 # React frontend
│   │   ├── components/     # React components
│   │   │   ├── generator/  # Wizard components
│   │   │   ├── landing/    # Landing page
│   │   │   └── ui/         # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # PDF generation logic
│   │   └── types/          # TypeScript types
│   └── views/              # Blade templates
├── routes/                 # Laravel routes
├── database/               # Migrations and seeders
└── public/                 # Public assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
