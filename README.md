# Servizo 🏠

A comprehensive service booking platform that connects customers with professional service providers for home services like cleaning, AC maintenance, plumbing, and more.

## 📋 Project Overview

Servizo is a web-based application inspired by platforms like UrbanClap (now Urban Company) that allows users to:
- Browse and book various home services
- Manage service appointments
- Rate and review service providers
- Track booking history

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js** - Server framework
- **MongoDB** - Database for storing users, services, and bookings
- **Mongoose** - ODM for MongoDB

### Frontend
- **EJS** - Template engine for server-side rendering
- **HTML5** - Markup
- **CSS3** - Styling
- **JavaScript** - Client-side functionality

### Additional Libraries (as needed)
- **bcryptjs** - Password hashing
- **express-session** - Session management
- **connect-mongo** - MongoDB session store
- **multer** - File upload handling
- **nodemailer** - Email notifications

## 🏗️ Project Structure

```
servizo/
├── src/
│   ├── app.js                 # Main application file
│   ├── controllers/           # Route handlers
│   │   ├── authController.js
│   │   ├── serviceController.js
│   │   ├── bookingController.js
│   │   └── userController.js
│   ├── models/               # Database schemas
│   │   ├── User.js
│   │   ├── Service.js
│   │   └── Booking.js
│   ├── routes/               # Route definitions
│   │   ├── auth.js
│   │   ├── services.js
│   │   ├── bookings.js
│   │   └── users.js
│   ├── middleware/           # Custom middleware
│   │   └── auth.js
│   └── config/              # Configuration files
│       └── database.js
├── views/                   # EJS templates
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── services/
│   │   ├── index.ejs
│   │   └── details.ejs
│   ├── bookings/
│   │   ├── create.ejs
│   │   └── list.ejs
│   └── index.ejs
├── public/                  # Static assets
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── images/
├── package.json
└── README.md
```

## 🎯 Core Features

### User Management
- [x] User registration and authentication
- [x] User profiles and preferences
- [x] Role-based access (Customer/Service Provider/Admin)

### Service Management
- [x] Service catalog with categories
- [x] Service details with pricing
- [x] Service provider profiles
- [x] Service availability management

### Booking System
- [x] Service booking with date/time selection
- [x] Booking confirmation and notifications
- [x] Booking history and status tracking
- [x] Cancellation and rescheduling

### Additional Features
- [x] Rating and review system
- [x] Search and filter services
- [x] Dashboard for different user roles
- [x] Basic payment integration (simulation)

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Spydiecy/Servizo.git
   cd Servizo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/servizo
   SESSION_SECRET=your_session_secret_here
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Run the application**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📱 Application Flow

### For Customers
1. Register/Login to the platform
2. Browse available services by category
3. Select service and view details
4. Choose date/time and book service
5. Track booking status
6. Rate and review after service completion

### For Service Providers
1. Register as a service provider
2. Set up profile and services offered
3. Manage availability and pricing
4. Receive and accept bookings
5. Update service status
6. View earnings and ratings

### For Admins
1. Manage users and service providers
2. Oversee service categories
3. Monitor platform activity
4. Handle disputes and issues

## 🎨 Design Principles

- **Professional UI/UX** - Clean, modern interface with intuitive navigation
- **Responsive Design** - Mobile-first approach for all screen sizes
- **Accessibility** - WCAG compliant for inclusive user experience
- **Performance** - Optimized loading times and smooth interactions

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: String (customer/provider/admin),
  address: Object,
  createdAt: Date
}
```

### Service Model
```javascript
{
  title: String,
  description: String,
  category: String,
  price: Number,
  duration: Number,
  provider: ObjectId (ref: User),
  rating: Number,
  reviews: [ObjectId] (ref: Review),
  isActive: Boolean,
  createdAt: Date
}
```

### Booking Model
```javascript
{
  customer: ObjectId (ref: User),
  service: ObjectId (ref: Service),
  provider: ObjectId (ref: User),
  scheduledDate: Date,
  scheduledTime: String,
  status: String (pending/confirmed/completed/cancelled),
  totalAmount: Number,
  address: Object,
  notes: String,
  createdAt: Date
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📈 Future Enhancements

- [ ] Real-time chat between customers and providers
- [ ] GPS tracking for service providers
- [ ] Push notifications
- [ ] Advanced payment gateway integration
- [ ] Mobile app development
- [ ] AI-powered service recommendations
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: [Your Name]
- **Course**: Backend Engineering (BEE)
- **Institution**: [Your College Name]

## 📞 Support

For support, email [your-email] or create an issue in this repository.

---

**Note**: This is an educational project developed as part of the Backend Engineering course curriculum.
