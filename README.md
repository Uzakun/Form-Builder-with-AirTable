# Airtable Form Builder

A dynamic form builder that seamlessly integrates with Airtable, allowing you to create custom forms that automatically sync responses to your Airtable bases with advanced conditional logic and field validation.

## 🚀 Features

### Core Features
- **Airtable Integration**: Direct connection to your Airtable bases and tables
- **Dynamic Form Creation**: Build forms with various field types (text, email, number, select, etc.)
- **Real-time Sync**: Form responses automatically saved to your Airtable tables
- **Conditional Logic**: Show/hide fields based on user responses
- **Field Validation**: Built-in validation with custom error messages
- **Responsive Design**: Mobile-friendly forms that work on all devices

### Advanced Features
- **Multi-step Forms**: Create complex forms with progress indicators
- **Custom Styling**: Customize form appearance and branding
- **Form Analytics**: Track views, submissions, and completion rates
- **Duplicate Prevention**: Optional settings to prevent multiple submissions
- **Export Options**: Export form data and analytics

### Security & Authentication
- **OAuth 2.1 Integration**: Secure authentication with Airtable
- **PKCE Support**: Enhanced security for OAuth flows
- **JWT Authentication**: Secure session management
- **Rate Limiting**: Protection against abuse and spam

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/airtable-form-builder.git
cd airtable-form-builder
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `backend/.env` with your configuration:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/airtable-form-builder
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/airtable-form-builder

# Security Keys
SESSION_SECRET=your-super-secret-session-key-change-in-production
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Airtable Configuration (see setup guide below)
AIRTABLE_CLIENT_ID=your-airtable-client-id
AIRTABLE_CLIENT_SECRET=your-airtable-client-secret
AIRTABLE_REDIRECT_URI=http://localhost:5000/api/auth/airtable/callback

# Alternative: Personal Access Token (for development)
AIRTABLE_PERSONAL_ACCESS_TOKEN=your-pat-token-here
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `frontend/.env`:

```bash
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_CLIENT_URL=http://localhost:3000
```

### 5. Database Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt update
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Option B: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

### 6. Start the Application

```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 🔐 Airtable OAuth App Setup Guide

### Method 1: OAuth Integration (Recommended for Production)

#### Step 1: Create OAuth Integration

1. Visit [Airtable Developer Hub](https://airtable.com/developers/web)
2. Sign in with your Airtable account
3. Click "OAuth integrations" → "Create new integration"

#### Step 2: Configure Integration Settings

**Basic Information:**
- **Name**: FormBuilder
- **Tagline**: Dynamic form builder connected to Airtable with conditional logic
- **Homepage URL**: `http://localhost:3000` (for development)
- **Logo**: Upload your logo (optional)

**OAuth Configuration:**
- **OAuth redirect URL**: `http://localhost:5000/api/auth/airtable/callback`
- **Scopes**: Select the following permissions:
  - ✅ `data.records:read` - See the data in records
  - ✅ `data.records:write` - Create, edit, and delete records  
  - ✅ `schema.bases:read` - See the structure of a base

**Developer Information:**
- **Support email**: your-email@example.com
- **Privacy policy URL**: `http://localhost:3000/privacy` (create a basic page)
- **Terms of service URL**: `http://localhost:3000/terms` (create a basic page)

#### Step 3: Get Your Credentials

After saving:
1. Copy your **Client ID**
2. Click "**Regenerate client secret**" and copy the secret immediately
3. Update your `backend/.env` file with these credentials

### Method 2: Personal Access Token (Quick Setup for Development)

#### Step 1: Create Personal Access Token

1. Go to [Airtable Tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. **Name**: FormBuilder Development
4. **Scopes**: Select:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read`
5. **Access**: Add your bases or select "All current and future bases"
6. Click "Create token" and copy it immediately

#### Step 2: Configure Environment

Add to your `backend/.env`:
```bash
AIRTABLE_PERSONAL_ACCESS_TOKEN=your_pat_token_here
```

#### Step 3: Use PAT Login

The application includes a PAT login endpoint for development:
```bash
curl -X POST http://localhost:5000/api/auth/airtable/pat-login
```

### Advanced Configuration

#### Conditional Logic Examples

**Show field based on selection:**
```javascript
// Show "Other" text field when "Other" is selected in dropdown
{
  condition: "equals",
  field: "category",
  value: "Other",
  action: "show",
  target: "other_category"
}
```

**Multiple conditions:**
```javascript
// Show discount field for premium customers over 25
{
  conditions: [
    { field: "customer_type", operator: "equals", value: "Premium" },
    { field: "age", operator: "greater_than", value: 25 }
  ],
  logic: "AND",
  action: "show",
  target: "discount_code"
}
```

#### Field Validation

```javascript
{
  field: "email",
  validation: {
    required: true,
    type: "email",
    message: "Please enter a valid email address"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**OAuth "invalid_client" Error:**
- Verify client ID and secret in `.env`
- Check redirect URI matches exactly
- Ensure Airtable integration is saved and active

**Database Connection Failed:**
- Check MongoDB is running (local) or connection string (Atlas)
- Verify network access in MongoDB Atlas
- Check firewall settings

**CORS Issues:**
- Verify `CLIENT_URL` in backend `.env`
- Check frontend API base URL configuration
- Ensure ports match (3000 for frontend, 5000 for backend)

**Form Creation Fails:**
- Check Airtable base and table permissions
- Verify Personal Access Token has correct scopes
- Check backend logs for specific errors

## 🙏 Acknowledgments

- [Airtable](https://airtable.com/) for their excellent API
- [React](https://reactjs.org/) for the frontend framework
- [Express.js](https://expressjs.com/) for the backend framework
- [MongoDB](https://www.mongodb.com/) for the database

## Screenshots

![Screenshot](images/Screenshot%20from%202025-08-17%2016-42-39.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2016-42-55.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2016-45-01.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2016-45-22.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2016-46-05.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2016-46-09.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2017-00-57.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2017-01-06.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2017-03-39.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2017-04-27.png)

![Screenshot](images/Screenshot%20from%202025-08-17%2017-23-47.png)
