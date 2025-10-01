# 🌱 Database Seeder - User Creation

## 📋 **Seeder Files Created**

### **1. `seeder.js` - Main Seeder**
- **Usage**: `node seeder.js`
- **Purpose**: Creates a default admin user
- **Features**: 
  - ✅ Checks if user already exists
  - ✅ Creates user with hashed password
  - ✅ Safe to run multiple times

### **2. `reset-seeder.js` - Reset Seeder**
- **Usage**: `node reset-seeder.js`
- **Purpose**: Deletes existing user and creates fresh one
- **Features**:
  - ✅ Deletes existing user first
  - ✅ Creates fresh user with new ID
  - ✅ Useful for testing

## 🚀 **How to Use**

### **Method 1: Create User (Safe)**
```bash
node seeder.js
```
- Creates user only if it doesn't exist
- Safe to run multiple times
- Won't overwrite existing user

### **Method 2: Reset and Create Fresh User**
```bash
node reset-seeder.js
```
- Deletes existing user first
- Creates fresh user with new ID
- Useful for testing or resetting

## 🔑 **Default User Credentials**

After running either seeder, you'll have:

- **Username**: `admin`
- **Password**: `admin123`
- **Is Admin**: `true`
- **Dashboard**: `http://localhost:5000`

## 🔒 **Security Features**

- ✅ **Password Hashing**: Automatically hashed with bcrypt
- ✅ **Salt Generation**: Unique salt for each password
- ✅ **Secure Storage**: Only hashed passwords stored in database
- ✅ **Admin Privileges**: User created with admin rights

## 📋 **What Happens When You Run Seeder**

1. **Connects to MongoDB** (mongodb://127.0.0.1:27017/alerts)
2. **Checks for existing user** (seeder.js only)
3. **Creates new user** with hashed password
4. **Shows user details** and login credentials
5. **Disconnects from database**

## 🎯 **Quick Start**

1. **Make sure MongoDB is running**
2. **Run the seeder**: `node seeder.js`
3. **Login to dashboard** with credentials shown
4. **Start using your application!**

## 🔧 **Customization**

To change the default user credentials, edit these files:

```javascript
// In seeder.js or reset-seeder.js
const DEFAULT_USER = {
  username: 'your_username',    // Change this
  password: 'your_password',    // Change this
  isAdmin: true                 // Keep as true for admin access
};
```

## ✅ **Ready to Use!**

Your seeder is now ready! Just run:

```bash
node seeder.js
```

And you'll have a user ready to login to your dashboard! 🎉
