const express = require('express');
const router = express.Router();
const {
    createService,
    getAllServices,
    getProviderServices,
    getServiceById,
    updateService,
    deleteService,
    toggleServiceStatus
} = require('../controllers/serviceController');
const { isAuthenticated, isProvider } = require('../middleware/auth');

// Public routes
// GET /services - Browse all services
router.get('/', (req, res) => {
    res.render('layouts/main', {
        title: 'Services',
        page: 'services/index',
        user: req.user
    });
});

// GET /services/api - API endpoint for services
router.get('/api', getAllServices);

// GET /services/:id - Service details page
router.get('/:id', async (req, res) => {
    try {
        res.render('layouts/main', {
            title: 'Service Details',
            page: 'services/details',
            user: req.user,
            serviceId: req.params.id
        });
    } catch (error) {
        console.error('Service details page error:', error);
        res.status(500).render('layouts/main', {
            title: 'Error',
            page: 'error',
            user: req.user,
            error: 'Service not found'
        });
    }
});

// GET /services/api/:id - API endpoint for single service
router.get('/api/:id', getServiceById);

// Protected routes (require authentication)
// GET /services/provider/my - Provider's services
router.get('/provider/my', isAuthenticated, isProvider, getProviderServices);

// POST /services - Create new service
router.post('/', isAuthenticated, isProvider, createService);

// PUT /services/:id - Update service
router.put('/:id', isAuthenticated, isProvider, updateService);

// DELETE /services/:id - Delete service
router.delete('/:id', isAuthenticated, isProvider, deleteService);

// PATCH /services/:id/toggle - Toggle service status
router.patch('/:id/toggle', isAuthenticated, isProvider, toggleServiceStatus);

module.exports = router;