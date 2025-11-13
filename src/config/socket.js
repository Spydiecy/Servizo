const socketIO = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Store connected users
    const users = new Map();

    io.on('connection', (socket) => {
        console.log('👤 New user connected:', socket.id);

        // Handle user joining
        socket.on('user_join', (userData) => {
            users.set(socket.id, {
                id: socket.id,
                name: userData.name || 'Guest',
                userId: userData.userId || null,
                joinedAt: new Date()
            });

            // Notify all users about the updated user list
            io.emit('user_list', Array.from(users.values()));
            
            // Notify all users that someone joined
            io.emit('user_joined', {
                userId: socket.id,
                userName: userData.name || 'Guest'
            });
            
            console.log(`✅ ${userData.name} joined the chat`);
        });

        // Handle chat message
        socket.on('chat_message', (data) => {
            const user = users.get(socket.id);
            const message = {
                id: Date.now(),
                userId: socket.id,
                userName: user?.name || 'Guest',
                message: data.message,
                timestamp: new Date(),
                isAdmin: data.isAdmin || false
            };

            // Broadcast message to all users
            io.emit('new_message', message);
            
            console.log(`💬 ${user?.name}: ${data.message}`);
        });

        // Handle typing indicator
        socket.on('typing', (data) => {
            const user = users.get(socket.id);
            socket.broadcast.emit('user_typing', {
                userId: socket.id,
                userName: user?.name || 'Guest',
                isTyping: data.isTyping
            });
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            const user = users.get(socket.id);
            users.delete(socket.id);
            
            // Notify all users about the updated user list
            io.emit('user_list', Array.from(users.values()));
            
            // Notify all users that someone left
            if (user) {
                io.emit('user_left', {
                    userId: socket.id,
                    userName: user.name
                });
            }
            
            console.log(`👋 ${user?.name || 'User'} disconnected`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initializeSocket, getIO };
