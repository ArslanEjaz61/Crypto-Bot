# Trading Pairs Trend Alert - Login System Guide

## Overview

This document provides a guide for using the authentication system implemented in the Trading Pairs Trend Alert application. The login system secures the dashboard and ensures only authorized users can access the application.

## Features

- User authentication with JWT (JSON Web Tokens)
- Protected routes requiring authentication
- Login page with form validation
- Persistent login state
- Logout functionality

## Setup Instructions

### 1. Install Required Dependencies

Backend dependencies have been installed:
- bcryptjs - For password hashing
- jsonwebtoken - For generating and verifying JWT tokens

Frontend dependencies needed (already in package.json):
- react-router-dom - For client-side routing
- jwt-decode - For decoding JWT tokens (optional)

### 2. Create an Admin User

To create the initial admin user, run the following command from the project root:

```bash
node server/scripts/createAdminUser.js <username> <password>
```

For example:
```bash
node server/scripts/createAdminUser.js admin secretpassword
```

This will create an admin user that can log into the system. Currently, the system only supports admin login (no registration).

### 3. Environment Variables

Ensure the `.env` file contains the JWT secret key:

```
JWT_SECRET=trading_pairs_secure_jwt_secret
```

## Using the Authentication System

### How to Login

1. Access the login page at `/login`
2. Enter the admin username and password created above
3. If authentication is successful, you'll be redirected to the dashboard

### Protected Routes

The following routes are protected and require authentication:
- `/dashboard` - Main dashboard
- `/` - Root URL (redirects to dashboard)

If you attempt to access a protected route without being authenticated, you will be redirected to the login page.

### Authentication Flow

1. **Login**: When a user logs in, the system:
   - Sends credentials to the server
   - Verifies username and password
   - Generates a JWT token
   - Stores user data and token in localStorage
   - Sets Authorization header for future API requests

2. **Route Protection**: Protected routes use the `ProtectedRoute` component which:
   - Checks if the user is authenticated
   - Redirects to login if not authenticated
   - Allows access to the route if authenticated

3. **Logout**: When a user logs out:
   - User data and token are removed from localStorage
   - Authorization header is cleared
   - User is redirected to the login page

## Authentication Context

The application uses a React Context (`AuthContext`) to manage authentication state. This context provides:

- `user` - Current user information
- `login(username, password)` - Login function
- `logout()` - Logout function
- `isAuthenticated()` - Function to check if user is authenticated
- `loading` - Loading state
- `error` - Error state

## Security Notes

- Passwords are hashed using bcryptjs before storing in the database
- JWT tokens are used for authentication
- JWT tokens expire after 30 days
- Protected routes prevent unauthorized access
- Authorization headers are set automatically for API requests

## Future Enhancements

Possible enhancements to the authentication system:
- User registration functionality
- Password reset functionality
- Role-based access control
- Token refresh mechanism
- Two-factor authentication
