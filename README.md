# Nestled - Shared Journal & Memory App for Couples

Nestled is a Progressive Web App (PWA) that provides couples with a private, delightful space to journal together, plan dates, and curate a shared scrapbook. The application encourages quick, constructive daily check-ins and strengthens connection through playful features like random prompts and shared memories.

## 🚀 Features

- **Daily Journal**: Quick, fun daily prompts to keep you connected even on busy days
- **Date Planner**: Plan and organize special moments together with ease
- **Shared Scrapbook**: Create a beautiful memory archive you can revisit anytime
- **Secure & Private**: End-to-end encryption and private by default

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS
- **Authentication**: Passage by 1Password (Passkey authentication)
- **Backend**: Supabase (PostgreSQL, RLS, JWT auth)
- **Deployment**: Vercel

## 🔧 Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Passage account
- Vercel account (optional, for deployment)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Passage variables
NEXT_PUBLIC_PASSAGE_APP_ID=your_passage_app_id
PASSAGE_API_KEY=your_passage_api_key
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/onchaincommerce/nestled.git
   cd nestled
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

1. Create a new Supabase project
2. Execute the SQL statements in the `schema.sql` file to set up the database schema with Row Level Security (RLS)

### Passage Setup

1. Create a new application in the Passage Console
2. Set the authentication origin to your domain (http://localhost:3000 for development)
3. Set the redirect URL to /dashboard
4. Make note of your APP ID and API KEY to add to environment variables

## 📝 Development Workflow

1. Create a branch for your feature
2. Make changes and commit
3. Create a pull request
4. Once approved, merge to main branch
5. Vercel will automatically deploy the changes

## 🧪 Testing

```bash
npm run test
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Passage by 1Password](https://passage.1password.com/)
- [Tailwind CSS](https://tailwindcss.com/)
