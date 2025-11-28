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
            const userName = typeof userData === 'string' ? userData : (userData.name || 'Guest');
            const userId = typeof userData === 'object' ? userData.userId : null;
            
            users.set(socket.id, {
                id: socket.id,
                name: userName,
                userId: userId,
                joinedAt: new Date()
            });

            // Notify all users about the updated user list
            const userList = Array.from(users.values());
            io.emit('user_list', userList);
            
            // Notify all users that someone joined
            io.emit('user_joined', {
                userId: socket.id,
                userName: userName,
                count: userList.length
            });
            
            console.log(`✅ ${userName} joined the chat (Total: ${userList.length})`);
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
            const userList = Array.from(users.values());
            io.emit('user_list', userList);
            
            // Notify all users that someone left
            if (user) {
                io.emit('user_left', {
                    userId: socket.id,
                    userName: user.name,
                    count: userList.length
                });
            }
            
            console.log(`👋 ${user?.name || 'User'} disconnected (Total: ${userList.length})`);
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
