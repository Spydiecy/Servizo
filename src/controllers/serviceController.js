const Service = require('../models/Service');
const User = require('../models/User');
const { getRedisClient } = require('../config/redis');

// Create a new service (Provider only)
const createService = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            subcategory,
            price,
            priceType,
            duration,
            features,
            serviceArea,
            availability,
            tags
        } = req.body;

        // Validate that user is a service provider
        if (req.user.userType !== 'provider') {
            return res.status(403).json({
                success: false,
                message: 'Only service providers can create services'
            });
        }

        // Create new service
        const service = new Service({
            title,
            description,
            category,
            subcategory,
            price: parseFloat(price),
            priceType,
            duration: parseInt(duration),
            features: features ? features.split(',').map(f => f.trim()) : [],
            provider: req.user._id,
            serviceArea: {
                city: serviceArea?.city || '',
                areas: serviceArea?.areas || [],
                radius: serviceArea?.radius || 10
            },
            availability: {
                days: availability?.days || [],
                timeSlots: availability?.timeSlots || []
            },
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        });

        await service.save();

        // Invalidate Redis cache for services
        const redisClient = getRedisClient();
        if (redisClient) {
            try {
                const keys = await redisClient.keys('services_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                    console.log('🗑️  Cleared services cache after creation');
                }
            } catch (redisError) {
                console.error('Redis cache clear error:', redisError.message);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            service
        });

    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating service',
            error: error.message
        });
    }
};

// Get all services (with filtering)
const getAllServices = async (req, res) => {
    try {
        const {
            category,
            city,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 12
        } = req.query;

        // Create cache key based on query parameters (using underscores for flat structure)
        const cacheKey = `services_${category || 'all'}_${city || 'all'}_${minPrice || '0'}_${maxPrice || 'max'}_${sortBy}_${sortOrder}_${page}_${limit}`;
        
        // Try to get from Redis cache
        const redisClient = getRedisClient();
        if (redisClient) {
            try {
                const cachedData = await redisClient.get(cacheKey);
                if (cachedData) {
                    console.log('✅ Serving services from Redis cache');
                    return res.json(JSON.parse(cachedData));
                }
            } catch (redisError) {
                console.error('Redis get error:', redisError.message);
                // Continue to fetch from database if Redis fails
            }
        }

        // Build filter object
        const filter = { isActive: true };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (city) {
            filter['serviceArea.city'] = new RegExp(city, 'i');
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        // Build sort object
        const sort = {};
        if (sortBy === 'price') {
            sort.price = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'rating') {
            sort['rating.average'] = -1;
        } else {
            sort.createdAt = -1;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get services with provider info
        const services = await Service.find(filter)
            .populate('provider', 'firstName lastName email phone rating')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalServices = await Service.countDocuments(filter);
        const totalPages = Math.ceil(totalServices / parseInt(limit));

        const responseData = {
            success: true,
            services,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalServices,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };

        // Store in Redis cache for 10 minutes
        if (redisClient) {
            try {
                await redisClient.setEx(cacheKey, 600, JSON.stringify(responseData));
                console.log('💾 Services cached in Redis');
            } catch (redisError) {
                console.error('Redis set error:', redisError.message);
                // Continue even if caching fails
            }
        }

        res.json(responseData);

    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching services',
            error: error.message
        });
    }
};

// Get services by provider (Provider dashboard)
const getProviderServices = async (req, res) => {
    try {
        const services = await Service.find({ provider: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            services
        });

    } catch (error) {
        console.error('Get provider services error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching your services',
            error: error.message
        });
    }
};

// Get single service by ID
const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id)
            .populate('provider', 'firstName lastName email phone rating profileImage');

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            service
        });

    } catch (error) {
        console.error('Get service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching service',
            error: error.message
        });
    }
};

// Update service (Provider only - own services)
const updateService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if user owns this service
        if (service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own services'
            });
        }

        const updateData = { ...req.body };
        
        // Process arrays if they're strings
        if (updateData.features && typeof updateData.features === 'string') {
            updateData.features = updateData.features.split(',').map(f => f.trim());
        }
        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = updateData.tags.split(',').map(t => t.trim());
        }

        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        // Invalidate Redis cache for services
        const redisClient = getRedisClient();
        if (redisClient) {
            try {
                const keys = await redisClient.keys('services_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                    console.log('🗑️  Cleared services cache after update');
                }
            } catch (redisError) {
                console.error('Redis cache clear error:', redisError.message);
            }
        }

        res.json({
            success: true,
            message: 'Service updated successfully',
            service: updatedService
        });

    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service',
            error: error.message
        });
    }
};

// Delete service (Provider only - own services)
const deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if user owns this service
        if (service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own services'
            });
        }

        await Service.findByIdAndDelete(req.params.id);

        // Invalidate Redis cache for services
        const redisClient = getRedisClient();
        if (redisClient) {
            try {
                const keys = await redisClient.keys('services_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                    console.log('🗑️  Cleared services cache after deletion');
                }
            } catch (redisError) {
                console.error('Redis cache clear error:', redisError.message);
            }
        }

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });

    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting service',
            error: error.message
        });
    }
};

// Toggle service status (active/inactive)
const toggleServiceStatus = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Check if user owns this service
        if (service.provider.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only modify your own services'
            });
        }

        service.isActive = !service.isActive;
        await service.save();

        // Invalidate Redis cache for services
        const redisClient = getRedisClient();
        if (redisClient) {
            try {
                const keys = await redisClient.keys('services_*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                    console.log('🗑️  Cleared services cache after status toggle');
                }
            } catch (redisError) {
                console.error('Redis cache clear error:', redisError.message);
            }
        }

        res.json({
            success: true,
            message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
            service
        });

    } catch (error) {
        console.error('Toggle service status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating service status',
            error: error.message
        });
    }
};

module.exports = {
    createService,
    getAllServices,
    getProviderServices,
    getServiceById,
    updateService,
    deleteService,
    toggleServiceStatus
};