const natural = require('natural');
const { Matrix } = require('ml-matrix');

class RecommendationEngine {
    constructor() {
        this.TfIdf = natural.TfIdf;
        this.tokenizer = new natural.WordTokenizer();
    }

    /**
     * Content-based filtering using TF-IDF
     * Recommends services similar to what user has booked/viewed
     */
    getContentBasedRecommendations(userBookings, allServices, limit = 5) {
        if (!userBookings || userBookings.length === 0) {
            return this.getPopularServices(allServices, limit);
        }

        // Filter out bookings without service data
        const validBookings = userBookings.filter(booking => booking.service && booking.service.title);
        
        if (validBookings.length === 0) {
            return this.getPopularServices(allServices, limit);
        }

        const tfidf = new this.TfIdf();

        // Create documents from user's booking history
        const userServiceTexts = validBookings.map(booking => 
            `${booking.service.title} ${booking.service.description || ''} ${booking.service.category || ''}`
        );

        // Create documents from all available services
        const allServiceTexts = allServices.map(service => 
            `${service.title} ${service.description || ''} ${service.category || ''}`
        );

        // Add all documents
        userServiceTexts.forEach(text => tfidf.addDocument(text));
        allServiceTexts.forEach(text => tfidf.addDocument(text));

        // Calculate similarity scores
        const scores = [];
        const userDocCount = userServiceTexts.length;

        // Get IDs of already booked services
        const bookedServiceIds = validBookings.map(booking => booking.service._id.toString());

        allServices.forEach((service, index) => {
            // Skip if user already booked this service
            if (bookedServiceIds.includes(service._id.toString())) {
                return;
            }

            let totalSimilarity = 0;

            // Compare with each user booking
            for (let i = 0; i < userDocCount; i++) {
                const similarity = this.calculateCosineSimilarity(
                    tfidf,
                    i,
                    userDocCount + index
                );
                totalSimilarity += similarity;
            }

            const avgSimilarity = totalSimilarity / userDocCount;

            if (avgSimilarity > 0) {
                scores.push({
                    service,
                    score: avgSimilarity
                });
            }
        });

        // Sort by score and return top recommendations
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => ({
                ...item.service.toObject(),
                recommendationScore: item.score,
                reason: 'Based on your booking history'
            }));
    }

    /**
     * Collaborative filtering
     * Recommends services based on similar users' behavior
     */
    getCollaborativeRecommendations(userId, allBookings, allServices, limit = 5) {
        // Create user-service matrix
        const userServiceMatrix = this.createUserServiceMatrix(allBookings);
        
        if (!userServiceMatrix.users[userId]) {
            return this.getPopularServices(allServices, limit);
        }

        const similarUsers = this.findSimilarUsers(userId, userServiceMatrix);
        const recommendations = [];

        // Get services booked by similar users but not by current user
        similarUsers.forEach(similarUser => {
            const userServices = userServiceMatrix.services[similarUser.userId];
            
            if (userServices) {
                userServices.forEach(serviceId => {
                    if (!userServiceMatrix.users[userId].includes(serviceId)) {
                        const service = allServices.find(
                            s => s._id.toString() === serviceId
                        );
                        
                        if (service) {
                            const existingIndex = recommendations.findIndex(
                                r => r._id.toString() === serviceId
                            );

                            if (existingIndex >= 0) {
                                recommendations[existingIndex].score += similarUser.similarity;
                            } else {
                                recommendations.push({
                                    ...service.toObject(),
                                    score: similarUser.similarity,
                                    reason: 'Users with similar interests booked this'
                                });
                            }
                        }
                    }
                });
            }
        });

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Hybrid recommendation combining multiple strategies
     */
    getHybridRecommendations(user, userBookings, allBookings, allServices, limit = 5) {
        // Get IDs of already booked services to exclude
        const bookedServiceIds = new Set(
            userBookings
                .filter(b => b.service && b.service._id)
                .map(b => b.service._id.toString())
        );

        // Filter out already booked services from all services
        const availableServices = allServices.filter(
            service => !bookedServiceIds.has(service._id.toString())
        );

        // If no bookings, return popular services
        if (userBookings.length === 0) {
            return this.getPopularServices(availableServices, limit);
        }

        const contentBased = this.getContentBasedRecommendations(
            userBookings,
            availableServices,
            Math.min(limit * 2, 20)
        );

        const collaborative = this.getCollaborativeRecommendations(
            user._id.toString(),
            allBookings,
            availableServices,
            Math.min(limit * 2, 20)
        );

        const categoryBased = this.getCategoryBasedRecommendations(
            userBookings,
            availableServices,
            Math.min(limit * 2, 20)
        );

        // Combine and weight recommendations
        const combined = {};

        // Weight: Content-based (50%)
        contentBased.forEach(service => {
            const serviceId = service._id.toString();
            combined[serviceId] = {
                service,
                score: (service.recommendationScore || 0.5) * 0.5,
                reasons: new Set(['Similar to your bookings'])
            };
        });

        // Weight: Collaborative (30%)
        collaborative.forEach(service => {
            const serviceId = service._id.toString();
            if (combined[serviceId]) {
                combined[serviceId].score += (service.score || 0.5) * 0.3;
                if (service.reason) combined[serviceId].reasons.add(service.reason);
            } else {
                combined[serviceId] = {
                    service,
                    score: (service.score || 0.5) * 0.3,
                    reasons: new Set([service.reason || 'Recommended for you'])
                };
            }
        });

        // Weight: Category-based (20%)
        categoryBased.forEach(service => {
            const serviceId = service._id.toString();
            if (combined[serviceId]) {
                combined[serviceId].score += 0.2;
                combined[serviceId].reasons.add('From your favorite categories');
            } else {
                combined[serviceId] = {
                    service,
                    score: 0.2,
                    reasons: new Set(['From your favorite categories'])
                };
            }
        });

        const results = Object.values(combined)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => {
                const serviceObj = item.service.toObject ? item.service.toObject() : item.service;
                return {
                    ...serviceObj,
                    recommendationReasons: Array.from(item.reasons).filter(r => r)
                };
            });

        // If we don't have enough recommendations, fill with popular services
        if (results.length < limit) {
            const existingIds = new Set(results.map(r => r._id.toString()));
            const additionalServices = this.getPopularServices(availableServices, limit - results.length)
                .filter(s => !existingIds.has(s._id.toString()))
                .map(s => ({
                    ...s,
                    recommendationReasons: ['Trending service']
                }));
            results.push(...additionalServices);
        }

        return results;
    }

    /**
     * Get category-based recommendations
     */
    getCategoryBasedRecommendations(userBookings, allServices, limit = 5) {
        if (!userBookings || userBookings.length === 0) {
            return this.getPopularServices(allServices, limit);
        }

        // Filter valid bookings
        const validBookings = userBookings.filter(booking => booking.service && booking.service.category);
        
        if (validBookings.length === 0) {
            return this.getPopularServices(allServices, limit);
        }

        // Find user's preferred categories
        const categoryCount = {};
        validBookings.forEach(booking => {
            const category = booking.service.category;
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        const preferredCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        // Get IDs of already booked services
        const bookedServiceIds = validBookings.map(booking => booking.service._id.toString());

        // Get services from preferred categories that user hasn't booked
        const recommendations = allServices.filter(service => {
            return !bookedServiceIds.includes(service._id.toString()) && 
                   preferredCategories.includes(service.category);
        });

        return recommendations
            .sort((a, b) => {
                const aIndex = preferredCategories.indexOf(a.category);
                const bIndex = preferredCategories.indexOf(b.category);
                return aIndex - bIndex;
            })
            .slice(0, limit);
    }

    /**
     * Get location-based recommendations
     */
    getLocationBasedRecommendations(user, allServices, limit = 5) {
        // Simple location matching (you can enhance with geospatial queries)
        if (!user.city) {
            return this.getPopularServices(allServices, limit);
        }

        return allServices
            .filter(service => 
                service.provider.city === user.city ||
                service.provider.state === user.state
            )
            .slice(0, limit);
    }

    /**
     * Get popular services (fallback)
     */
    getPopularServices(allServices, limit = 5) {
        return allServices
            .sort((a, b) => {
                const aRating = a.averageRating || 0;
                const bRating = b.averageRating || 0;
                return bRating - aRating;
            })
            .slice(0, limit)
            .map(service => ({
                ...service.toObject(),
                reason: 'Trending service'
            }));
    }

    /**
     * Create user-service interaction matrix
     */
    createUserServiceMatrix(bookings) {
        const matrix = {
            users: {}, // userId -> [serviceIds]
            services: {} // userId -> [serviceIds]
        };

        bookings.forEach(booking => {
            const userId = booking.customer._id.toString();
            const serviceId = booking.service._id.toString();

            if (!matrix.users[userId]) {
                matrix.users[userId] = [];
            }
            if (!matrix.services[userId]) {
                matrix.services[userId] = [];
            }

            if (!matrix.users[userId].includes(serviceId)) {
                matrix.users[userId].push(serviceId);
            }
            if (!matrix.services[userId].includes(serviceId)) {
                matrix.services[userId].push(serviceId);
            }
        });

        return matrix;
    }

    /**
     * Find similar users using Jaccard similarity
     */
    findSimilarUsers(userId, userServiceMatrix, limit = 10) {
        const userServices = userServiceMatrix.users[userId];
        const similarities = [];

        Object.keys(userServiceMatrix.users).forEach(otherUserId => {
            if (otherUserId !== userId) {
                const otherServices = userServiceMatrix.users[otherUserId];
                const similarity = this.jaccardSimilarity(userServices, otherServices);

                if (similarity > 0) {
                    similarities.push({
                        userId: otherUserId,
                        similarity
                    });
                }
            }
        });

        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Calculate Jaccard similarity between two sets
     */
    jaccardSimilarity(set1, set2) {
        const intersection = set1.filter(item => set2.includes(item)).length;
        const union = new Set([...set1, ...set2]).size;
        return union === 0 ? 0 : intersection / union;
    }

    /**
     * Calculate cosine similarity using TF-IDF
     */
    calculateCosineSimilarity(tfidf, doc1Index, doc2Index) {
        const terms = {};

        tfidf.listTerms(doc1Index).forEach(item => {
            terms[item.term] = { doc1: item.tfidf, doc2: 0 };
        });

        tfidf.listTerms(doc2Index).forEach(item => {
            if (terms[item.term]) {
                terms[item.term].doc2 = item.tfidf;
            } else {
                terms[item.term] = { doc1: 0, doc2: item.tfidf };
            }
        });

        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        Object.values(terms).forEach(({ doc1, doc2 }) => {
            dotProduct += doc1 * doc2;
            mag1 += doc1 * doc1;
            mag2 += doc2 * doc2;
        });

        const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
}

module.exports = new RecommendationEngine();
